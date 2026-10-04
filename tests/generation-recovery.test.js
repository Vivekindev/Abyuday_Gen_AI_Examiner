import test from 'node:test';
import assert from 'node:assert/strict';
import { generateInteractiveAssessment } from '../functions/assessment/orchestrator.js';
import { validateQuestion } from '../functions/assessment/engines.js';
import { validateEngineDefinition, evaluateTokens, initialDynamicState, gradeDynamicQuestion, dynamicMeasurements } from '../shared/dynamicEngine.js';
import { initializeDynamicTask } from '../functions/assessment/taskInitialization.js';
import { dynamicTaskSchemaFor } from '../functions/assessment/dynamicSchemas.js';
import { validateEngineForGeneration } from '../functions/assessment/engineQuality.js';
import { generationFailure } from '../functions/assessment/generationErrors.js';
import { interactionExamples } from '../client/src/components/assessment/examples.js';
import { energyEngine, energyQuestion, energyObjective, energyAuthorResponse } from './fixtures/dynamic.js';
import { compileFormula, compileEngineExpressions } from '../functions/assessment/formulaCompiler.js';

test('arithmetic expressions compile with precedence, RC units, and no code execution', () => {
  const evaluate = (source, values = {}) => evaluateTokens(compileFormula(source), values);
  assert.equal(evaluate('2 + 3 * 4'), 14);
  assert.equal(evaluate('-2^2'), -4);
  assert.equal(evaluate('2^3^2'), 512);
  assert.equal(evaluate('max(2, min(5, 3))'), 3);
  assert.equal(evaluate('pow(2, 3) + abs(-4)'), 12);
  assert.equal(evaluate('1e-3 * $r', { r: 1000 }), 1);
  const rc = 'supply * (1 - exp(-(time_ms * 0.001) / (resistance * capacitance_uf * 0.000001)))';
  assert.ok(Math.abs(evaluate(rc, { supply: 10, time_ms: 100, resistance: 1000, capacitance_uf: 100 }) - 10 * (1 - Math.exp(-1))) < 1e-9);
  for (const source of ['process.exit()', 'globalThis.x', 'constructor(1)', 'mass[0]', '1;2', '1 +', 'exp(1,2)', '1 2', 'true ? 1 : 0', '('.repeat(30) + '1' + ')'.repeat(30)]) assert.throws(() => compileFormula(source));
  const engine = structuredClone(energyEngine);
  engine.metrics[0] = { id: 'energy', label: 'Energy', unit: 'J', expression: '0.5 * mass * speed^2' };
  const compiled = compileEngineExpressions(engine);
  validateEngineDefinition(compiled);
  assert.equal(Object.hasOwn(compiled.metrics[0], 'expression'), false);
  assert.equal(evaluateTokens(compiled.metrics[0].tokens, { mass: 2, speed: 10 }), 100);
});

test('matching supports category IDs from the structured schema and rejects broken references', () => {
  const q = structuredClone(interactionExamples.find((item) => item.kind === 'matching'));
  const oldIds = q.config.categories.map((item) => item.id);
  q.config.categories.forEach((item, i) => { item.id = `c${i + 1}`; });
  q.answer = Object.fromEntries(Object.entries(q.answer).map(([key, value]) => [key, `c${oldIds.indexOf(value) + 1}`]));
  validateQuestion(q);
  q.answer[q.config.items[0].id] = 'unknown';
  assert.throws(() => validateQuestion(q), /assignments/);
  q.config.categories[0].id = '__proto__';
  assert.throws(() => validateQuestion(q), /safe IDs/);
});

test('control diagnostics identify the failing control and RC exponential stays bounded', () => {
  const engine = structuredClone(energyEngine);
  engine.controls[0].step = 1e-9;
  assert.throws(() => validateEngineDefinition(engine), /Control mass.*100000.*step=/);
  assert.ok(Math.abs(evaluateTokens(['-1', 'exp'], {}) - Math.exp(-1)) < 1e-12);
  assert.equal(evaluateTokens(['1000', 'exp'], {}), null);
  engine.controls[0].step = 0;
  assert.throws(() => validateEngineDefinition(engine), /Control mass: step must be positive/);
});

test('new calculation engines reject unused simulation switches, while answer-entry fields work', () => {
  const engine = structuredClone(energyEngine);
  engine.controls.push({ id: 'ac_mode', label: 'AC mode', type: 'toggle', unit: '', min: 0, max: 1, step: 1, initial: 'false', options: [] });
  validateEngineDefinition(engine); // Existing attempt snapshots remain readable.
  assert.throws(() => validateEngineForGeneration(engine), /ac_mode.*affects no measurements/);
  engine.metrics = [];
  validateEngineForGeneration(engine);
});

test('successful questions survive a later failure and resume without repeat author calls', async () => {
  const circuit = structuredClone(interactionExamples[0]);
  const graph = structuredClone(interactionExamples[1]);
  const plan = { questions: [circuit, graph].map((q) => ({ kind: q.kind, domain: 'science', objective: q.questionText })) };
  let checkpoint;
  const calls = [];
  await assert.rejects(generateInteractiveAssessment({ prompt: 'Mixed science', count: 2, difficulty: 5, savedPlan: plan,
    onQuestion: async (questions) => { checkpoint = structuredClone(questions); },
    generate: async ({ agent, instructions }) => {
      calls.push(agent);
      if (agent === 'electronics-author') return [circuit];
      if (calls.filter((name) => name === agent).length === 2) {
        assert.match(instructions, /Previous response/);
        assert.match(instructions, /Wrong number/);
      }
      return [];
    },
  }), /Wrong number/);
  assert.equal(checkpoint[0].kind, 'circuit'); assert.equal(checkpoint[1], null);
  const retryCalls = [];
  const done = await generateInteractiveAssessment({ prompt: 'Mixed science', count: 2, difficulty: 5, savedPlan: plan, savedQuestions: checkpoint,
    generate: async ({ agent }) => { retryCalls.push(agent); return [graph]; },
  });
  assert.deepEqual(retryCalls, ['graph-author']);
  assert.deepEqual(done.questions.map((q) => q.kind), ['circuit', 'graph']);
});

test('unsupported engine decisions receive a capability repair before rejection', async () => {
  let builds = 0;
  const result = await generateInteractiveAssessment({ prompt: 'Energy', count: 1, difficulty: 5, savedPlan: { questions: [energyObjective] },
    registry: { catalog: async () => [], resolve: async ({ build }) => (await build()).definition },
    generate: async ({ agent, instructions }) => {
      if (agent !== 'engine-builder') return energyAuthorResponse;
      if (++builds === 1) return { supported: false, reason: 'Requires solving advanced math', definition: {} };
      assert.match(instructions, /precomputed targets/);
      return { supported: true, reason: 'Numeric controls suffice', definition: energyEngine };
    },
  });
  assert.equal(builds, 2); assert.equal(result.questions.length, 1);
});

test('persisted diagnostics distinguish validation from provider errors without leaking provider bodies', () => {
  const validation = Object.assign(new Error('Control capacitance: step must be positive'), { generationValidation: true, agent: 'engine-builder' });
  assert.match(generationFailure(validation).message, /capacitance/);
  const provider = Object.assign(new Error('private-provider-body'), { status: 503 });
  assert.doesNotMatch(JSON.stringify(generationFailure(provider)), /private-provider-body/);
  assert.match(generationFailure(provider).message, /503/);
});

test('a task solved by registry defaults gets a separate unsolved snapshot without another model call', async () => {
  const engine = structuredClone(energyEngine);
  engine.controls[0].initial = '2'; engine.controls[1].initial = '10';
  const original = structuredClone(engine);
  let calls = 0;
  const result = await generateInteractiveAssessment({ prompt: 'Physics', count: 1, difficulty: 8,
    savedPlan: { questions: [energyObjective] },
    registry: { catalog: async () => [], resolve: async () => engine },
    generate: async ({ schema }) => {
      calls++;
      assert.deepEqual(schema.properties.solution.items.properties.id.enum, ['mass', 'speed']);
      assert.equal(schema.properties.solution.minItems, 2);
      return structuredClone(energyAuthorResponse);
    },
  });
  const q = result.questions[0];
  validateQuestion(q);
  assert.equal(calls, 1);
  assert.equal(gradeDynamicQuestion(q, initialDynamicState(q.config.engine)), false);
  assert.equal(gradeDynamicQuestion(q, q.answer), true);
  assert.deepEqual(q.checks, energyQuestion.checks);
  assert.deepEqual(engine, original);
  assert.notDeepEqual(q.config.engine.controls, engine.controls);
});

test('automatic starts skip singular measurements and reject tasks with no failing start', () => {
  const q = structuredClone(energyQuestion);
  q.config.engine.metrics[0].tokens = ['1', '$mass', '2', 'sub', 'div'];
  q.config.engine.controls[0].initial = '3';
  q.checks = [{ source: 'energy', expected: '1', tolerance: 0 }];
  q.answer.mass = '3';
  const fixed = initializeDynamicTask(q);
  validateQuestion(fixed);
  assert.notEqual(fixed.config.engine.controls[0].initial, '2');
  assert.ok(Object.values(dynamicMeasurements(fixed.config.engine, initialDynamicState(fixed.config.engine))).every(Number.isFinite));
  q.config.engine.metrics[0].tokens = ['1'];
  assert.throws(() => initializeDynamicTask(q), /no valid unsolved starting state/);
  q.answer.mass = '999';
  assert.throws(() => initializeDynamicTask(q), /Solution control mass is invalid/);
});

test('dynamic task schemas constrain solution IDs to editable controls and checks to known sources', () => {
  const schema = dynamicTaskSchemaFor(energyEngine);
  assert.deepEqual(schema.properties.solution.items.properties.id.enum, ['mass', 'speed']);
  assert.equal(schema.properties.solution.maxItems, 2);
  assert.deepEqual(schema.properties.checks.items.properties.source.enum, ['mass', 'speed', 'energy']);
  const other = structuredClone(energyEngine);
  other.controls[0].id = 'weight';
  assert.deepEqual(dynamicTaskSchemaFor(other).properties.solution.items.properties.id.enum, ['weight', 'speed']);
  assert.deepEqual(schema.properties.solution.items.properties.id.enum, ['mass', 'speed']);
});
