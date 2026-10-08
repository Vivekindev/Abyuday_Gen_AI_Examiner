import test from 'node:test';
import assert from 'node:assert/strict';
import { activityExamples } from '../client/src/components/assessment/activityExamples.js';
import { validateQuestion, validAnswer, hasAnswer, gradeAnswer, publicQuestion, scoreAnswers, assessmentMinutes } from '../functions/assessment/engines.js';
import { activityProgress } from '../shared/activityTemplates.js';
import { responsePresent } from '../client/src/components/assessment/interactionMeta.js';
import { activityAgents } from '../functions/assessment/activitySchemas.js';
import { generateInteractiveAssessment } from '../functions/assessment/orchestrator.js';

const clone = (q) => structuredClone(q);
const [pairs, cloze, diagram, code, line] = activityExamples;
const solution = (q) => q.kind === 'numberline' ? { position: q.answer } : q.answer;

test('all activity templates validate, grade, time correctly and hide solutions', () => {
  for (const q of activityExamples) {
    assert.equal(validateQuestion(q), q);
    assert.equal(gradeAnswer(q, solution(q)), true, q.kind);
    const safe = publicQuestion({ ...q, secret: 'solution', rubric: 'private' });
    assert.deepEqual(Object.keys(safe).sort(), ['config', 'kind', 'questionText', 'tag']);
    assert.equal(safe.answer, undefined);
    assert.equal(safe.explanation, undefined);
    assert.equal(validAnswer(safe, solution(q)), true);
  }
  assert.equal(assessmentMinutes(activityExamples), 15);
  assert.equal(scoreAnswers(activityExamples, activityExamples.map(solution)).score, 5);
});

test('partial answers round-trip without earning points; client and server agree about empty answers', () => {
  const blanks = [['', '', ''], ['', '', ''], [], [], ''];
  const partial = [['dna', '', ''], ['energy', '', ''], ['rabbit'], [], ''];
  activityExamples.forEach((q, i) => {
    assert.equal(validAnswer(q, blanks[i]), true);
    assert.equal(hasAnswer(q, blanks[i]), false);
    assert.equal(responsePresent(q, blanks[i]), false);
    assert.equal(validAnswer(q, JSON.parse(JSON.stringify(partial[i]))), true);
    assert.equal(gradeAnswer(q, partial[i]), false);
  });
  const scored = scoreAnswers(activityExamples, partial);
  assert.equal(scored.unanswered, 2);
  assert.equal(scored.incorrect, 3);
});

test('pairs and word bank reject reused tokens and incomplete shapes', () => {
  for (const q of [pairs, cloze]) {
    assert.equal(validAnswer(q, [q.answer[0], q.answer[0], '']), false);
    assert.equal(validAnswer(q, [q.answer[0]]), false);
    assert.equal(validAnswer(q, ['forged', '', '']), false);
    const reversed = [...q.answer].reverse();
    assert.equal(gradeAnswer(q, reversed), false);
  }
  const bad = clone(pairs); bad.config.right[0].id = '__proto__';
  assert.throws(() => validateQuestion(bad), /safe IDs/);
  const leaked = clone(cloze); leaked.config.solution = leaked.answer;
  assert.throws(() => validateQuestion(leaked), /Word-bank/);
});

test('diagram and code selection are unordered, bounded and reference valid targets', () => {
  assert.equal(gradeAnswer(diagram, [...diagram.answer].reverse()), true);
  assert.equal(validAnswer(diagram, [...diagram.answer, 'frog']), false);
  assert.equal(validAnswer(diagram, ['rabbit', 'rabbit']), false);
  assert.equal(validAnswer(code, [0]), false);
  assert.equal(validAnswer(code, ['4']), false);
  assert.equal(validAnswer(code, [999]), false);
  const bad = clone(diagram); bad.config.edges[0].to = 'missing';
  assert.throws(() => validateQuestion(bad), /edges/);
  const overlap = clone(diagram); Object.assign(overlap.config.nodes[1], { x: 15, y: 50 });
  assert.throws(() => validateQuestion(overlap), /Space diagram/);
  const outOfView = clone(diagram); outOfView.config.nodes[0].x = 100;
  assert.throws(() => validateQuestion(outOfView), /visible coordinates/);
  const multiline = clone(code); multiline.config.lines[0] += '\nalert(1)';
  assert.throws(() => validateQuestion(multiline), /single lines/);
});

test('number-line values enforce reachable finite steps and count a zero response as answered', () => {
  assert.equal(validAnswer(line, { position: 0 }), true);
  assert.equal(hasAnswer(line, { position: 0 }), true);
  assert.equal(responsePresent(line, { position: 0 }), true);
  assert.equal(activityProgress(line, { position: 0 }).answered, 1);
  for (const answer of [{ position: NaN }, { position: Infinity }, { position: -1 }, { position: 0.376 }, { position: '0.375' }, { position: 0.375, correct: true }]) assert.equal(validAnswer(line, answer), false);
  const unreachable = clone(line); unreachable.answer = 0.376;
  assert.throws(() => validateQuestion(unreachable), /reachable/);
  const tinySteps = clone(line); tinySteps.config.step = 1e-10;
  assert.throws(() => validateQuestion(tinySteps), /steps/);
  const tolerance = clone(line); tolerance.config.tolerance = 1;
  assert.throws(() => validateQuestion(tolerance), /tolerance/);
});

test('planner routes all new kinds to their specialists and resumes validated checkpoints', async () => {
  const plan = { questions: activityExamples.map((q) => ({ kind: q.kind, domain: q.tag[0], objective: q.questionText })) };
  const calls = [];
  const generate = async ({ agent, instructions }) => {
    calls.push(agent);
    if (agent === 'assessment-planner') { assert.match(instructions, /word bank|word-bank/); assert.match(instructions, /learning objective/); return plan; }
    const [kind] = Object.entries(activityAgents).find(([, spec]) => spec.name === agent);
    return [clone(activityExamples.find((q) => q.kind === kind))];
  };
  const result = await generateInteractiveAssessment({ prompt: 'Mixed activities in science, language, math and coding', count: 5, difficulty: 5, generate });
  assert.deepEqual(result.questions.map((q) => q.kind), activityExamples.map((q) => q.kind));
  assert.equal(calls.length, 6);
  const saved = await generateInteractiveAssessment({ prompt: 'Mixed activities', count: 5, difficulty: 5, savedPlan: plan, savedQuestions: result.questions, generate: async () => { throw new Error('Checkpoints should be reused'); } });
  assert.equal(saved.questions.length, 5);
});
