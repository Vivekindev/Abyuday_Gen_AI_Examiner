import test from 'node:test';
import assert from 'node:assert/strict';
import { interactionExamples } from '../client/src/components/assessment/examples.js';
import { validateQuestion, publicQuestion, validAnswer, gradeAnswer, scoreAnswers, simulateCircuit, assessmentMinutes } from '../functions/assessment/engines.js';
import { generateInteractiveAssessment } from '../functions/assessment/orchestrator.js';

const [circuit, graph, ordering, matching] = interactionExamples;
const clone = (value) => structuredClone(value);
const mcq = { questionText: '2 + 2?', options: ['3', '4', '5', '6'], answer: '4', tag: ['arithmetic'] };

test('interaction contracts accept shipped examples and preserve legacy MCQs', () => {
  [...interactionExamples, mcq].forEach((q) => assert.equal(validateQuestion(q), q));
  assert.equal(assessmentMinutes([...interactionExamples, mcq]), 16);
  assert.equal(gradeAnswer(mcq, '4'), true);
  assert.equal(gradeAnswer(mcq, '3'), false);
});

test('circuit engine grades physical outcomes including alternate valid solutions', () => {
  const parallel = { r1: 1000, r2: 1000, topology: 'parallel', closed: true };
  assert.deepEqual(simulateCircuit(circuit.config, parallel), { resistance: 500, currentMa: 10 });
  assert.equal(gradeAnswer(circuit, parallel), true);
  assert.equal(gradeAnswer(circuit, { r1: 250, r2: 250, topology: 'series', closed: true }), true);
  assert.equal(gradeAnswer(circuit, { ...parallel, closed: false }), false);
  assert.equal(gradeAnswer(circuit, circuit.config.initial), false);
  assert.equal(validAnswer(circuit, { ...parallel, score: 1 }), false);
  assert.equal(validAnswer(circuit, { ...parallel, r1: '1000' }), false);
  assert.equal(validAnswer(circuit, { ...parallel, r1: 0 }), false);
});

test('graph solver requires all points and rejects out-of-range or off-grid controls', () => {
  assert.equal(gradeAnswer(graph, { slope: 2, intercept: 1 }), true);
  assert.equal(gradeAnswer(graph, { slope: 0, intercept: 1 }), false);
  assert.equal(validAnswer(graph, { slope: 5.5, intercept: 1 }), false);
  assert.equal(validAnswer(graph, { slope: 2.01, intercept: 1 }), false);
  assert.equal(validAnswer(graph, { slope: NaN, intercept: 1 }), false);
});

test('unreachable, trivial or unsupported simulations never publish', () => {
  const unreachable = clone(circuit); unreachable.config.targetCurrentMa = 9.123;
  assert.throws(() => validateQuestion(unreachable), /reachable/);
  const trivial = clone(circuit); trivial.config.initial.topology = 'parallel';
  assert.throws(() => validateQuestion(trivial), /unsolved/);
  const nonlinear = clone(graph); nonlinear.config.points[2].y = 6;
  assert.throws(() => validateQuestion(nonlinear), /solvable/);
  const injected = clone(graph); injected.config.script = 'alert(1)';
  assert.throws(() => validateQuestion(injected), /fields/);
  assert.throws(() => validateQuestion({ ...circuit, kind: 'arbitrary-code' }), /Unsupported/);
});

test('ordering requires a complete permutation and matching supports incomplete saved work', () => {
  assert.equal(validAnswer(ordering, ['i1', 'i1', 'i3', 'i4']), false);
  assert.equal(validAnswer(ordering, ['i1']), false);
  assert.equal(gradeAnswer(ordering, ordering.answer), true);
  assert.equal(gradeAnswer(ordering, ['i2', 'i1', 'i3', 'i4']), false);
  const partial = { i1: 'i1', i2: '', i3: '', i4: '' };
  assert.equal(validAnswer(matching, partial), true);
  assert.equal(gradeAnswer(matching, partial), false);
  assert.equal(gradeAnswer(matching, matching.answer), true);
  assert.equal(validAnswer(matching, { ...partial, i2: 'missing' }), false);
  assert.equal(validAnswer(matching, { i1: 'i1' }), false);
});

test('public payload hides all answers, explanations and extra generated fields', () => {
  for (const q of [...interactionExamples, mcq]) {
    const safe = publicQuestion({ ...q, secret: 'private', rubric: 'private' });
    for (const field of ['answer', 'explanation', 'rubric', 'secret']) assert.equal(Object.hasOwn(safe, field), false);
  }
});

test('mixed scoring treats untouched and empty category responses as unanswered', () => {
  const result = scoreAnswers([circuit, graph, ordering, matching, mcq], [
    { r1: 1000, r2: 1000, topology: 'parallel', closed: true }, '', ['i2', 'i1', 'i3', 'i4'], { i1: '', i2: '', i3: '', i4: '' }, '4',
  ]);
  assert.equal(result.score, 2); assert.equal(result.incorrect, 1); assert.equal(result.unanswered, 2); assert.equal(result.percentage, 40);
  assert.deepEqual(result.outcomes.map((o) => o.correct), [true, false, false, false, true]);
});

const plan = { questions: interactionExamples.map((q) => ({ kind: q.kind, domain: q.tag[0], objective: q.questionText })) };
function authorResult(agent) {
  const kind = { 'electronics-author': 'circuit', 'graph-author': 'graph', 'sequence-author': 'ordering', 'classification-author': 'matching' }[agent];
  const q = clone(interactionExamples.find((item) => item.kind === kind));
  if (kind === 'matching') { q.assignments = Object.entries(q.answer).map(([itemId, categoryId]) => ({ itemId, categoryId })); delete q.answer; }
  return [q];
}
test('planner routes across specialist agents, preserves order and records bounded trace', async () => {
  const calls = []; const progress = [];
  const result = await generateInteractiveAssessment({ prompt: 'Mixed science and programming', count: 4, difficulty: 5,
    onProgress: async (event) => progress.push(event.stage),
    generate: async ({ agent, validate }) => { calls.push(agent); const value = agent === 'assessment-planner' ? plan : authorResult(agent); validate(value); return value; },
  });
  assert.deepEqual(calls, ['assessment-planner', 'electronics-author', 'graph-author', 'sequence-author', 'classification-author']);
  assert.deepEqual(result.questions.map((q) => q.kind), ['circuit', 'graph', 'ordering', 'matching']);
  assert.equal(result.trace.length, 5);
  assert.equal(progress.at(-1), 'validation');
  assert.deepEqual(result.questions[3].answer, matching.answer);
});

test('validation errors get one repair attempt with actionable feedback', async () => {
  let authorCalls = 0;
  const result = await generateInteractiveAssessment({ prompt: 'Electronics', count: 1, difficulty: 5, generate: async ({ agent, instructions }) => {
    if (agent === 'assessment-planner') return { questions: [plan.questions[0]] };
    authorCalls++;
    const q = clone(circuit);
    if (authorCalls === 1) q.config.targetCurrentMa = 9.123;
    else assert.match(instructions, /failed validation.*reachable/);
    return [q];
  } });
  assert.equal(authorCalls, 2);
  assert.deepEqual(result.trace.map((step) => step.status), ['success', 'failed', 'success']);
});

test('invalid plans and provider errors stop without unbounded delegation', async () => {
  let calls = 0;
  await assert.rejects(generateInteractiveAssessment({ prompt: 'Topic', count: 1, difficulty: 5, generate: async () => { calls++; return { questions: [{ kind: 'execute-js', domain: 'code', objective: 'Run code' }] }; } }));
  assert.equal(calls, 3);
  calls = 0;
  await assert.rejects(generateInteractiveAssessment({ prompt: 'Topic', count: 1, difficulty: 5, generate: async () => { calls++; throw Object.assign(new Error('Unavailable'), { status: 503 }); } }));
  assert.equal(calls, 1);
});
