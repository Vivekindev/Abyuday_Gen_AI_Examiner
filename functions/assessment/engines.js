// Server-owned interaction contracts. Generated content is data, never executable UI/code.
import { validDynamicResponse, gradeDynamicQuestion, validateDynamicQuestion } from '../../shared/dynamicEngine.js';
import { validateQuestionContent } from './contentValidation.js';
import { ACTIVITY_TEMPLATES, validActivityResponse, gradeActivity, activityProgress, validateActivity } from '../../shared/activityTemplates.js';
export const ENGINE_KINDS = ['mcq', 'circuit', 'graph', 'ordering', 'matching', 'dynamic', ...Object.keys(ACTIVITY_TEMPLATES)];
export const ENGINE_MINUTES = { mcq: 1, circuit: 5, graph: 4, ordering: 3, matching: 3, ...Object.fromEntries(Object.entries(ACTIVITY_TEMPLATES).map(([kind, item]) => [kind, item.minutes])) };
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v, max = 2000) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const num = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const exactKeys = (v, keys) => object(v) && Object.keys(v).length === keys.length && keys.every((key) => Object.hasOwn(v, key));
const strings = (v, min, max) => Array.isArray(v) && v.length >= min && v.length <= max && v.every((s) => text(s, 400)) && new Set(v).size === v.length;
const permutation = (v, source) => Array.isArray(v) && v.length === source.length && new Set(v).size === v.length && v.every((id) => source.includes(id));
const cards = (v, min = 3, max = 8) => Array.isArray(v) && v.length >= min && v.length <= max && v.every((c) => exactKeys(c, ['id', 'label']) && /^[a-z][a-z0-9_]{0,31}$/.test(c.id) && !['constructor', 'prototype', '__proto__'].includes(c.id) && text(c.label, 300)) && new Set(v.map((c) => c.id)).size === v.length;
const assert = (condition, message) => { if (!condition) throw new Error(message); };

export function simulateCircuit(config, state) {
  const resistance = state.topology === 'series'
    ? state.r1 + state.r2 : (state.r1 * state.r2) / (state.r1 + state.r2);
  return { resistance, currentMa: state.closed ? config.voltage / resistance * 1000 : 0 };
}

export function validAnswer(question, answer) {
  if (answer === '') return true;
  const kind = question.kind || 'mcq';
  const c = question.config;
  if (Object.hasOwn(ACTIVITY_TEMPLATES, kind)) return validActivityResponse(question, answer);
  switch (kind) {
    case 'dynamic': return validDynamicResponse(c.engine, answer);
    case 'mcq': return typeof answer === 'string' && question.options.includes(answer);
    case 'ordering': return permutation(answer, c.items.map((item) => item.id));
    case 'matching': return exactKeys(answer, c.items.map((item) => item.id)) && Object.values(answer).every((id) => id === '' || c.categories.some((category) => category.id === id));
    case 'circuit': return exactKeys(answer, ['r1', 'r2', 'topology', 'closed']) && c.resistorChoices.includes(answer.r1) && c.resistorChoices.includes(answer.r2) && ['series', 'parallel'].includes(answer.topology) && typeof answer.closed === 'boolean';
    case 'graph': return exactKeys(answer, ['slope', 'intercept']) && [answer.slope, answer.intercept].every((v) => num(v, -5, 5) && Math.abs(v * 2 - Math.round(v * 2)) < 1e-8);
    default: return false;
  }
}

export function hasAnswer(question, answer) {
  if (answer === '' || answer === undefined || answer === null) return false;
  if (Object.hasOwn(ACTIVITY_TEMPLATES, question.kind || 'mcq')) return activityProgress(question, answer).answered > 0;
  if (question.kind === 'matching') return Object.values(answer).some(Boolean);
  if (question.kind === 'dynamic') return Object.values(answer).some((v) => v !== '');
  return true;
}

export function gradeAnswer(question, answer) {
  if (!hasAnswer(question, answer) || !validAnswer(question, answer)) return false;
  if (Object.hasOwn(ACTIVITY_TEMPLATES, question.kind || 'mcq')) return gradeActivity(question, answer);
  switch (question.kind || 'mcq') {
    case 'dynamic': return gradeDynamicQuestion(question, answer);
    case 'mcq': return answer === question.answer;
    case 'ordering': return answer.every((id, index) => id === question.answer[index]);
    case 'matching': return question.config.items.every(({ id }) => answer[id] === question.answer[id]);
    case 'circuit': return Math.abs(simulateCircuit(question.config, answer).currentMa - question.config.targetCurrentMa) <= question.config.toleranceMa + 1e-9;
    case 'graph': return question.config.points.every(({ x, y }) => Math.abs(answer.slope * x + answer.intercept - y) <= question.config.tolerance + 1e-9);
    default: return false;
  }
}

export function validateQuestion(q) {
  assert(object(q) && ENGINE_KINDS.includes(q.kind || 'mcq'), 'Unsupported interaction engine');
  assert(text(q.questionText) && Array.isArray(q.tag) && q.tag.length <= 8 && q.tag.every((t) => text(t, 80)), 'Invalid question text or tags');
  validateQuestionContent(q);
  const kind = q.kind || 'mcq';
  if (kind === 'mcq') {
    assert(strings(q.options, 4, 4) && q.options.includes(q.answer), 'Invalid multiple choice answer');
    return q;
  }
  assert(text(q.explanation, 3000), 'An interaction needs a review explanation');
  const c = q.config;
  assert(object(c), 'Missing interaction configuration');
  if (Object.hasOwn(ACTIVITY_TEMPLATES, kind)) validateActivity(q);
  if (kind === 'dynamic') validateDynamicQuestion(q);
  if (kind === 'ordering') {
    assert(exactKeys(c, ['items']) && cards(c.items) && permutation(q.answer, c.items.map((i) => i.id)), 'Invalid ordering task');
    assert(!c.items.every((item, i) => item.id === q.answer[i]), 'Ordering task must start shuffled');
  }
  if (kind === 'matching') {
    assert(exactKeys(c, ['items', 'categories']), 'Matching config must contain only items and categories');
    assert(cards(c.items), 'Matching items require 3-8 unique safe IDs and nonempty labels of at most 300 characters');
    assert(cards(c.categories, 2, 5), 'Matching categories require 2-5 unique safe IDs and nonempty labels of at most 300 characters');
    assert(validAnswer(q, q.answer) && Object.values(q.answer).every(Boolean), 'Missing category assignments');
  }
  if (kind === 'circuit') {
    assert(exactKeys(c, ['voltage', 'resistorChoices', 'targetCurrentMa', 'toleranceMa', 'initial']), 'Invalid circuit fields');
    assert(num(c.voltage, 1, 24) && Array.isArray(c.resistorChoices) && c.resistorChoices.length >= 2 && c.resistorChoices.length <= 8 && c.resistorChoices.every((r) => num(r, 100, 100000)) && new Set(c.resistorChoices).size === c.resistorChoices.length, 'Use 1–24 V and 2–8 distinct resistors of 100–100000 ohms');
    assert(num(c.targetCurrentMa, 0.001, 480) && num(c.toleranceMa, 0.00001, c.targetCurrentMa * 0.05) && validAnswer(q, c.initial), 'Invalid circuit target or starting state');
    let solvable = false;
    for (const r1 of c.resistorChoices) for (const r2 of c.resistorChoices) for (const topology of ['series', 'parallel']) {
      if (gradeAnswer(q, { r1, r2, topology, closed: true })) solvable = true;
    }
    assert(solvable && !gradeAnswer(q, c.initial), 'Circuit must have a reachable goal and an unsolved starting state');
  }
  if (kind === 'graph') {
    assert(exactKeys(c, ['points', 'tolerance', 'initial']) && Array.isArray(c.points) && c.points.length >= 2 && c.points.length <= 5, 'Invalid graph fields');
    assert(c.points.every((p) => exactKeys(p, ['x', 'y']) && num(p.x, -5, 5) && num(p.y, -10, 10)) && new Set(c.points.map((p) => p.x)).size === c.points.length, 'Graph points need distinct x values in the visible range');
    assert(num(c.tolerance, 0.001, 0.1) && validAnswer(q, c.initial), 'Invalid graph tolerance or starting state');
    let solvable = false;
    for (let slope = -5; slope <= 5; slope += 0.5) for (let intercept = -5; intercept <= 5; intercept += 0.5) if (gradeAnswer(q, { slope, intercept })) solvable = true;
    assert(solvable && !gradeAnswer(q, c.initial), 'Graph must be solvable using the available controls and start unsolved');
  }
  return q;
}

export function publicQuestion(q) {
  // Allowlist rather than deleting answer: no rubric, explanation, agent trace or unknown field can leak.
  const safe = { questionText: q.questionText, tag: q.tag };
  if (q.kind) safe.kind = q.kind;
  if (!q.kind || q.kind === 'mcq') safe.options = q.options;
  else safe.config = q.config;
  return safe;
}

export function assessmentMinutes(questions) {
  return questions.reduce((sum, q) => sum + (q.kind === 'dynamic' ? q.config.engine.minutes : ENGINE_MINUTES[q.kind || 'mcq'] || 1), 0);
}

export function scoreAnswers(questions, answers) {
  const outcomes = questions.map((q, i) => ({ answered: hasAnswer(q, answers[i]), correct: gradeAnswer(q, answers[i]) }));
  const score = outcomes.filter((o) => o.correct).length;
  const answered = outcomes.filter((o) => o.answered).length;
  return { score, total: questions.length, incorrect: answered - score, unanswered: questions.length - answered, percentage: Math.round(score / questions.length * 100), outcomes };
}
