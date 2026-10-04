import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEngineDefinition, dynamicMeasurements, initialDynamicState, evaluateTokens } from '../shared/dynamicEngine.js';
import { validateQuestion, validAnswer, gradeAnswer, publicQuestion, assessmentMinutes, scoreAnswers } from '../functions/assessment/engines.js';
import { generateInteractiveAssessment } from '../functions/assessment/orchestrator.js';
import { energyEngine, energyQuestion, energyObjective, energyAuthorResponse } from './fixtures/dynamic.js';

test('dynamic workbench calculates physical outcomes and keeps private grading out of public payloads', () => {
  validateQuestion(energyQuestion);
  assert.equal(dynamicMeasurements(energyEngine, { mass: '2', speed: '10' }).energy, 100);
  assert.equal(dynamicMeasurements(energyEngine, { mass: '8', speed: '5' }).energy, 100);
  assert.equal(gradeAnswer(energyQuestion, { mass: '8', speed: '5' }), true);
  assert.equal(gradeAnswer(energyQuestion, { mass: '2', speed: '5' }), false);
  assert.equal(gradeAnswer(energyQuestion, { mass: '', speed: '10' }), false);
  assert.equal(validAnswer(energyQuestion, { mass: '2', speed: '10', score: '1' }), false);
  assert.equal(validAnswer(energyQuestion, { mass: '2', speed: '10.5' }), false);
  const safe = publicQuestion(energyQuestion);
  assert.equal(safe.answer, undefined); assert.equal(safe.checks, undefined); assert.equal(safe.explanation, undefined);
  assert.deepEqual(safe.config.engine, energyEngine);
  assert.equal(assessmentMinutes([energyQuestion]), 4);
  assert.equal(scoreAnswers([energyQuestion], [{ mass: '', speed: '' }]).unanswered, 1);
});

test('interpreter rejects code, forward references, invalid stacks and unbounded definitions', () => {
  for (const tokens of [['process.exit()'], ['$constructor'], ['$future'], ['1', 'add'], ['1', '2'], ['$mass', '100', 'pow']]) {
    const engine = structuredClone(energyEngine); engine.metrics[0].tokens = tokens;
    assert.throws(() => validateEngineDefinition(engine));
  }
  const extra = { ...energyEngine, script: 'anything' };
  assert.throws(() => validateEngineDefinition(extra), /fields/);
  const tooMany = { ...energyEngine, controls: Array(13).fill(energyEngine.controls[0]) };
  assert.throws(() => validateEngineDefinition(tooMany), /1–12/);
  const zero = structuredClone(energyEngine); zero.metrics[0].tokens = ['1', '$speed', 'div'];
  assert.throws(() => validateEngineDefinition(zero), /starting state/);
  assert.equal(evaluateTokens(['1', '0', 'div'], {}), null);
  assert.equal(evaluateTokens(['-1', 'sqrt'], {}), null);
  const chain = structuredClone(energyEngine); chain.metrics.push({ id: 'double_energy', label: 'Twice energy', unit: 'J', tokens: ['$energy', '2', 'mul'] });
  validateEngineDefinition(chain);
  assert.equal(dynamicMeasurements(chain, { mass: '2', speed: '10' }).double_energy, 200);
});

test('task validation requires a legal passing witness, private checks, and an unsolved start', () => {
  assert.throws(() => validateQuestion({ ...energyQuestion, answer: { mass: '2', speed: '4' } }), /passing/);
  assert.throws(() => validateQuestion({ ...energyQuestion, checks: [{ source: 'unknown', expected: '1', tolerance: 0 }] }), /source/);
  assert.throws(() => validateQuestion({ ...energyQuestion, answer: initialDynamicState(energyEngine), checks: [{ source: 'energy', expected: '0', tolerance: 0 }] }), /start solved/);
  assert.throws(() => validateQuestion({ ...energyQuestion, config: { ...energyQuestion.config, checks: energyQuestion.checks } }), /config/);
});

test('generated text, choice and toggle fields have deterministic grading', () => {
  const engine = {
    key: 'cell-response-grid', title: 'Cell response grid', description: 'Identify a structure and its function.', version: 1, minutes: 3,
    controls: [
      { id: 'name', label: 'Structure that stores DNA', type: 'text', unit: '', min: 0, max: 1, step: 1, initial: '', options: [] },
      { id: 'category', label: 'Cell type', type: 'choice', unit: '', min: 0, max: 1, step: 1, initial: '', options: ['Prokaryotic', 'Eukaryotic'] },
      { id: 'membrane', label: 'Has a nuclear membrane', type: 'toggle', unit: '', min: 0, max: 1, step: 1, initial: 'false', options: [] },
    ], metrics: [],
  };
  const q = { ...energyQuestion, config: { engine, instructions: 'Complete the fields for a nucleus.' }, checks: [{ source: 'name', expected: 'nucleus', tolerance: 0 }, { source: 'category', expected: 'Eukaryotic', tolerance: 0 }, { source: 'membrane', expected: 'true', tolerance: 0 }], answer: { name: ' Nucleus ', category: 'Eukaryotic', membrane: 'true' } };
  validateQuestion(q); assert.equal(gradeAnswer(q, q.answer), true);
  assert.equal(gradeAnswer(q, { ...q.answer, name: 'DNA' }), false);
});

test('planner requests an engine, builds it and authors against its registered definition', async () => {
  const calls = []; const events = [];
  const registry = {
    catalog: async () => [], recordRequests: async (plan) => { events.push('requested'); assert.equal(plan[0].engineKey, energyEngine.key); },
    resolve: async ({ requirement, slot, build }) => { assert.match(requirement, /sliders/); assert.equal(slot, 0); assert.deepEqual(events, ['requested']); const result = await build(); events.push('registered'); return result.definition; },
  };
  const result = await generateInteractiveAssessment({ prompt: 'Kinetic energy task', count: 1, difficulty: 5, registry,
    generate: async ({ agent }) => { calls.push(agent); if (agent === 'assessment-planner') return { questions: [energyObjective] }; if (agent === 'engine-builder') return { supported: true, reason: 'Supported with arithmetic measurements', definition: energyEngine }; return energyAuthorResponse; },
  });
  assert.deepEqual(calls, ['assessment-planner', 'engine-builder', 'dynamic-task-author']);
  assert.equal(result.questions[0].config.engine.key, energyEngine.key);
  assert.deepEqual(result.questions[0].answer, energyQuestion.answer);
  assert.deepEqual(events, ['requested', 'registered']);
});

test('planner can reuse engines without builder calls; generation repairs invalid engine definitions', async () => {
  let builds = 0;
  const registry = { catalog: async () => [{ key: energyEngine.key, title: energyEngine.title, description: energyEngine.description }], resolve: async () => energyEngine };
  await generateInteractiveAssessment({ prompt: 'Physics', count: 1, difficulty: 5, registry, generate: async ({ agent, instructions }) => {
    if (agent === 'assessment-planner') { assert.match(instructions, /kinetic-energy-lab/); return { questions: [energyObjective] }; }
    if (agent === 'engine-builder') builds++;
    return energyAuthorResponse;
  } });
  assert.equal(builds, 0);
  registry.resolve = async ({ build }) => (await build()).definition;
  await generateInteractiveAssessment({ prompt: 'Physics', count: 1, difficulty: 5, registry, generate: async ({ agent, instructions }) => {
    if (agent === 'assessment-planner') return { questions: [energyObjective] };
    if (agent === 'engine-builder') {
      builds++;
      if (builds === 1) return { supported: true, reason: '', definition: { ...energyEngine, script: 'no' } };
      assert.match(instructions, /failed validation/); return { supported: true, reason: '', definition: energyEngine };
    }
    return energyAuthorResponse;
  } });
  assert.equal(builds, 2);
});

test('retries reuse the saved plan without another planner charge', async () => {
  const calls = [];
  await generateInteractiveAssessment({ prompt: 'Physics', count: 1, difficulty: 5,
    savedPlan: { questions: [energyObjective] },
    registry: { catalog: async () => [], resolve: async () => energyEngine },
    onPlan: () => { throw new Error('Must not replace a saved plan'); },
    generate: async ({ agent }) => { calls.push(agent); return energyAuthorResponse; },
  });
  assert.deepEqual(calls, ['dynamic-task-author']);
});
