// Inject known failures, then exercise real Gemini recovery in an isolated database.
import 'dotenv/config';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { generateInteractiveAssessment } from '../functions/assessment/orchestrator.js';
import { createAgentGenerator } from '../functions/geminiQueryRun.js';
import { DEFAULT_GEMINI_MODEL } from '../config/geminiModels.js';
import { flushTelemetry } from '../functions/telemetry.js';
import { validateQuestion } from '../functions/assessment/engines.js';
import { interactionExamples } from '../client/src/components/assessment/examples.js';

if (!process.argv.includes('--live')) throw new Error('Pass --live to exercise recovery using Gemini quota.');
const dbName = `abyuday_recovery_${randomUUID().replaceAll('-', '')}`;
try {
  await mongoose.connect(`mongodb://127.0.0.1:27017/${dbName}`, { serverSelectionTimeoutMS: 5000 });
  for (const mode of ['repair', 'adaptation']) {
    const context = { user: new mongoose.Types.ObjectId(), testID: `recovery-${mode}` };
    const live = createAgentGenerator(DEFAULT_GEMINI_MODEL, context);
    const result = await generateInteractiveAssessment({
      prompt: 'Physics: assess DC series and parallel circuits and resistance.', count: 1, difficulty: 5,
      savedPlan: { questions: [{ kind: 'circuit', domain: 'Physics', objective: 'Understand the effect of series and parallel resistor arrangements on current.' }] },
      onProgress: async ({ stage }) => console.log(`${mode}: ${stage}`),
      generate: async (request) => {
        if (request.agent === 'electronics-author' || (mode === 'adaptation' && request.agent === 'assessment-repair' && request.schema.items.properties.config.properties.voltage)) {
          const bad = structuredClone(interactionExamples[0]);
          bad.config.targetCurrentMa = 9.123; // Deliberately unreachable.
          request.validate([bad]);
          return [bad];
        }
        try { return await live(request); }
        catch (error) {
          if (error.generationValidation) console.log(JSON.stringify({ agent: request.agent, validation: error.message }));
          throw error;
        }
      },
    });
    result.questions.forEach(validateQuestion);
    if (mode === 'repair' && !result.trace.some((s) => s.agent === 'assessment-repair')) throw new Error('Expected escalation to the repair specialist');
    if (mode === 'adaptation' && !result.trace.some((s) => s.status === 'adapted')) throw new Error('Expected a successful alternative interaction');
    console.log(JSON.stringify({ mode, validated: true, kinds: result.questions.map((q) => q.kind), trace: result.trace }));
  }
} catch (error) {
  console.error(JSON.stringify({ validated: false, errorType: error.name, httpStatus: error.status || null }));
  process.exitCode = 1;
} finally {
  await flushTelemetry();
  if (mongoose.connection.readyState === 1) {
    if (mongoose.connection.name !== dbName || !dbName.startsWith('abyuday_recovery_')) throw new Error('Refusing to clean an unexpected database');
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
}
