import test from 'node:test';
import assert from 'node:assert/strict';
import { generateInteractiveAssessment } from '../functions/assessment/orchestrator.js';
import { validateQuestion, publicQuestion } from '../functions/assessment/engines.js';
import { interactionExamples } from '../client/src/components/assessment/examples.js';
import { energyObjective } from './fixtures/dynamic.js';

const circuit = interactionExamples.find((q) => q.kind === 'circuit');
const graph = interactionExamples.find((q) => q.kind === 'graph');
const matching = interactionExamples.find((q) => q.kind === 'matching');
const objective = (q) => ({ kind: q.kind, domain: 'Physics', objective: q.questionText });
const matchingResponse = () => {
  const q = structuredClone(matching);
  q.assignments = Object.entries(q.answer).map(([itemId, categoryId]) => ({ itemId, categoryId }));
  delete q.answer;
  return [q];
};
const base = { prompt: 'Physics', count: 1, difficulty: 5, savedPlan: { questions: [objective(circuit)] } };

test('recovery specialist receives the rejected question and diagnoses it under the same schema', async () => {
  const calls = [];
  const result = await generateInteractiveAssessment({ ...base,
    generate: async ({ agent, schema, instructions, validate }) => {
      calls.push(agent);
      const bad = structuredClone(circuit); bad.config.targetCurrentMa = 9.123;
      if (agent === 'assessment-repair') {
        assert.match(instructions, /recovery specialist/);
        assert.match(instructions, /reachable/);
        assert.match(instructions, /Previous response/);
        assert.ok(schema.items.properties.config);
      }
      const response = [agent === 'assessment-repair' ? circuit : bad];
      validate(response); return response;
    },
  });
  assert.deepEqual(calls, ['electronics-author', 'electronics-author', 'assessment-repair']);
  assert.equal(result.trace.at(-1).repairsAgent, 'electronics-author');
  validateQuestion(result.questions[0]);
});

test('unrepairable interaction becomes a validated alternative and checkpoints resume without regeneration', async () => {
  let checkpoint, savedPlan;
  const calls = [];
  const result = await generateInteractiveAssessment({ ...base,
    onPlan: async (value) => { savedPlan = structuredClone(value); },
    onQuestion: async (value) => { checkpoint = structuredClone(value); },
    generate: async ({ agent, instructions }) => {
      calls.push(agent);
      if (agent === 'classification-author') { assert.match(instructions, /same subject and learning objective/); return matchingResponse(); }
      return [];
    },
  });
  assert.deepEqual(calls, ['electronics-author', 'electronics-author', 'assessment-repair', 'classification-author']);
  assert.equal(result.questions[0].kind, 'matching');
  assert.equal(savedPlan.questions[0].kind, 'matching');
  assert.equal(savedPlan.questions[0].objective, base.savedPlan.questions[0].objective);
  assert.equal(base.savedPlan.questions[0].kind, 'circuit');
  assert.equal(result.trace.at(-1).status, 'adapted');
  assert.equal(publicQuestion(result.questions[0]).answer, undefined);
  const resumed = await generateInteractiveAssessment({ ...base, savedPlan, savedQuestions: checkpoint,
    generate: async () => { throw new Error('Valid recovered checkpoint must not be regenerated'); },
  });
  assert.deepEqual(resumed.questions, result.questions);
});

test('failed dynamic engine construction can recover the question and records the adaptation', async () => {
  let recorded;
  let builds = 0;
  const result = await generateInteractiveAssessment({ ...base, savedPlan: { questions: [energyObjective] },
    registry: { catalog: async () => [], resolve: async ({ build }) => (await build()).definition,
      recordAdaptation: async (slot, kind) => { recorded = { slot, kind }; } },
    generate: async ({ operation }) => {
      if (operation === 'engine_build') { builds++; return { supported: false, reason: 'Requested interaction unavailable', definition: {} }; }
      return matchingResponse();
    },
  });
  assert.equal(builds, 3);
  assert.deepEqual(recorded, { slot: 0, kind: 'matching' });
  assert.equal(result.questions[0].kind, 'matching');
});

test('exhausted content recovery saves later valid questions and stops at the call budget', async () => {
  let checkpoint;
  const calls = [];
  await assert.rejects(generateInteractiveAssessment({ ...base, count: 2,
    savedPlan: { questions: [objective(circuit), objective(graph)] },
    onQuestion: async (value) => { checkpoint = structuredClone(value); },
    generate: async ({ agent }) => { calls.push(agent); return agent === 'graph-author' ? [graph] : []; },
  }), /Wrong number/);
  assert.equal(calls.length, 7); // Three original + three alternative + one independent question.
  assert.equal(checkpoint[0], null);
  assert.deepEqual(checkpoint[1], { ...graph, schemaVersion: 1 });
});

test('provider and storage failures never trigger content fixes or an alternative interaction', async () => {
  for (const status of [401, 429, 503]) {
    let calls = 0;
    await assert.rejects(generateInteractiveAssessment({ ...base, generate: async () => {
      calls++; throw Object.assign(new Error('Provider unavailable'), { status });
    } }), (error) => error.status === status);
    assert.equal(calls, 1);
  }
  let calls = 0;
  await assert.rejects(generateInteractiveAssessment({ ...base,
    onQuestion: async () => { throw new Error('Database unavailable'); },
    generate: async () => { calls++; return [circuit]; },
  }), /Database unavailable/);
  assert.equal(calls, 1);
});

test('malformed JSON receives repair feedback without exposing its rejected body', async () => {
  let calls = 0;
  const result = await generateInteractiveAssessment({ ...base, generate: async ({ instructions }) => {
    if (++calls === 1) throw new SyntaxError('private rejected response');
    assert.match(instructions, /Invalid JSON response/);
    assert.doesNotMatch(instructions, /private rejected response/);
    return [circuit];
  } });
  assert.equal(result.questions.length, 1);
  assert.equal(calls, 2);
});

test('duplicate questions are repaired inside the author loop before checkpointing', async () => {
  const second = structuredClone(circuit); second.questionText = 'Find another circuit configuration meeting the displayed current target.';
  let calls = 0;
  const result = await generateInteractiveAssessment({ ...base, count: 2,
    savedPlan: { questions: [objective(circuit), objective(second)] }, savedQuestions: [circuit, null],
    generate: async ({ instructions }) => {
      if (++calls === 1) return [circuit];
      assert.match(instructions, /duplicates a previously authored question/);
      return [second];
    },
  });
  assert.equal(calls, 2);
  assert.equal(new Set(result.questions.map((q) => q.questionText)).size, 2);
});
