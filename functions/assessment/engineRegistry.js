import { randomUUID } from 'node:crypto';
import { AssessmentEngine, EngineRequest } from '../../models/assessmentEngine.js';
import { validateEngineForGeneration } from './engineQuality.js';
import { generationFailure } from './generationErrors.js';

export const engineScope = ({ user, team }) => team ? `team:${team}` : `user:${user}`;

export function createEngineRegistry(context) {
  const scope = engineScope(context);
  return {
    async recordAdaptation(slot, kind) {
      await EngineRequest.updateOne({ scope, testID: context.testID, slot }, { $set: {
        status: 'adapted', message: `The original interaction could not be validated. This question was recovered as a ${kind} activity for the same learning objective.`,
      } });
    },
    async recordRequests(plan) {
      for (const [slot, question] of plan.entries()) {
        if (question.kind !== 'dynamic') continue;
        const identity = { scope, testID: context.testID, slot };
        await EngineRequest.updateOne(identity, { $setOnInsert: { ...identity, key: question.engineKey, domain: question.domain, objective: question.objective, requirement: question.engineRequirement, user: context.user, team: context.team || null, status: 'requested' } }, { upsert: true });
        await EngineRequest.updateOne({ ...identity, status: { $in: ['failed', 'unsupported'] } }, { $set: { status: 'requested', message: 'Assessment retry requested. Waiting to build or reuse this engine.' } });
      }
    },
    async catalog() {
      const entries = await AssessmentEngine.find({ scope, status: 'ready' }).sort({ updatedAt: -1 }).limit(50).lean();
      return entries.map(({ key, definition }) => ({ key, title: definition.title, description: definition.description }));
    },
    async resolve({ key, domain, objective, requirement, slot, build }) {
      const identity = { scope, testID: context.testID, slot };
      const request = await EngineRequest.findOneAndUpdate(identity, { $set: { key, domain, objective, requirement }, $setOnInsert: { ...identity, user: context.user, team: context.team || null, status: 'requested' } }, { upsert: true, new: true });
      const updateRequest = (values) => EngineRequest.updateOne({ _id: request._id }, { $set: values });
      const existing = await AssessmentEngine.findOne({ scope, key, status: 'ready' }).lean();
      if (existing) {
        try {
          validateEngineForGeneration(existing.definition);
          await updateRequest({ status: 'reused', engine: existing._id, message: 'Reused a registered engine.' });
          return existing.definition;
        } catch {
          // Repair legacy definitions on demand. Existing assessments retain their snapshots.
          await AssessmentEngine.updateOne({ _id: existing._id, status: 'ready', updatedAt: existing.updatedAt }, { $set: { status: 'failed' } });
        }
      }
      const token = randomUUID();
      let entry;
      try {
        entry = await AssessmentEngine.findOneAndUpdate(
          { scope, key, status: { $ne: 'ready' }, $or: [{ leaseUntil: { $lte: new Date() } }, { leaseUntil: { $exists: false } }] },
          { $set: { status: 'building', buildToken: token, leaseUntil: new Date(Date.now() + 6 * 60_000) }, $setOnInsert: { scope, key, user: context.user, team: context.team || null } },
          { upsert: true, new: true },
        );
      } catch (error) {
        if (error.code !== 11000) throw error;
        const winner = await AssessmentEngine.findOne({ scope, key, status: 'ready' }).lean();
        if (winner) {
          validateEngineForGeneration(winner.definition);
          await updateRequest({ status: 'reused', engine: winner._id, message: 'Reused a registered engine.' });
          return winner.definition;
        }
        await updateRequest({ status: 'requested', message: 'Another worker is building this engine. Assessment will retry.' });
        throw Object.assign(new Error('Engine build already in progress'), { status: 503, engineBusy: true });
      }
      await updateRequest({ status: 'building', engine: entry._id, message: 'Building and validating the requested interaction.' });
      try {
        const result = await build();
        if (!result.supported) {
          await updateRequest({ status: 'unsupported', message: result.reason });
          throw Object.assign(new Error('Requested engine is outside the available runtime capabilities'), { unsupported: true });
        }
        const definition = validateEngineForGeneration(result.definition);
        if (definition.key !== key) throw new Error('Engine key does not match request');
        const saved = await AssessmentEngine.updateOne({ _id: entry._id, buildToken: token, status: 'building' }, { $set: { status: 'ready', definition }, $unset: { buildToken: 1, leaseUntil: 1 } });
        if (saved.modifiedCount !== 1) throw Object.assign(new Error('Engine build lease was replaced'), { status: 503 });
        await updateRequest({ status: 'ready', message: 'Validated and registered automatically.' });
        return definition;
      } catch (error) {
        await AssessmentEngine.updateOne({ _id: entry._id, buildToken: token }, { $set: { status: 'failed' }, $unset: { buildToken: 1, leaseUntil: 1 } });
        if (!error.unsupported || error.generationValidation) await updateRequest({ status: error.unsupported ? 'unsupported' : 'failed', message: generationFailure(error, 'engine-builder').message });
        throw error;
      }
    },
  };
}
