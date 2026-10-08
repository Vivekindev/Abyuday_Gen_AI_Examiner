// Reusable, data-only activities. Answers remain on the server in live attempts.
export const ACTIVITY_TEMPLATES = {
  pairs: { name: 'Pair connections', minutes: 3, description: 'Connect concepts with their partners.', topics: ['Vocabulary', 'Science', 'Computing'] },
  cloze: { name: 'Word-bank puzzle', minutes: 3, description: 'Complete an explanation with a bank of tokens.', topics: ['Languages', 'Science', 'Computing'] },
  hotspots: { name: 'Diagram explorer', minutes: 3, description: 'Find the right nodes in a concept map.', topics: ['Biology', 'Systems', 'Workflows'] },
  bughunt: { name: 'Code detective', minutes: 4, description: 'Inspect a snippet and pinpoint the faulty lines.', topics: ['Programming', 'SQL', 'Debugging'] },
  numberline: { name: 'Number-line quest', minutes: 2, description: 'Place a marker at the value you calculate.', topics: ['Math', 'Physics', 'Estimation'] },
};
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const exact = (v, keys) => object(v) && Object.keys(v).length === keys.length && keys.every((k) => Object.hasOwn(v, k));
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const text = (v, max = 300) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const id = (v) => typeof v === 'string' && /^[a-z][a-z0-9_]{0,31}$/.test(v) && !['constructor', 'prototype', '__proto__'].includes(v);
const unique = (v) => new Set(v).size === v.length;
const cards = (v, min, max) => Array.isArray(v) && v.length >= min && v.length <= max && v.every((c) => exact(c, ['id', 'label']) && id(c.id) && text(c.label)) && unique(v.map((c) => c.id)) && unique(v.map((c) => c.label.trim().toLowerCase()));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const onGrid = (n, c) => finite(n) && n >= c.min && n <= c.max && Math.abs(n - (c.min + Math.round((n - c.min) / c.step) * c.step)) <= Math.max(Number.EPSILON * Math.max(1, Math.abs(n), Math.abs(c.min)) * 8, c.step * 1e-6);

export function validActivityResponse(q, value) {
  if (value === '') return true;
  const c = q.config;
  if (q.kind === 'numberline') return exact(value, ['position']) && onGrid(value.position, c);
  if (!Array.isArray(value)) return false;
  if (q.kind === 'pairs' || q.kind === 'cloze') {
    const options = q.kind === 'pairs' ? c.right : c.options;
    const length = q.kind === 'pairs' ? c.left.length : c.segments.length - 1;
    return value.length === length && value.every((v) => v === '' || options.some((o) => o.id === v)) && unique(value.filter(Boolean));
  }
  if (q.kind === 'hotspots') return value.length <= c.pickCount && unique(value) && value.every((v) => c.nodes.some((n) => n.id === v));
  if (q.kind === 'bughunt') return value.length <= c.pickCount && unique(value) && value.every((v) => Number.isInteger(v) && v >= 1 && v <= c.lines.length);
  return false;
}

export function activityProgress(q, value) {
  const c = q.config;
  const total = q.kind === 'pairs' ? c.left.length : q.kind === 'cloze' ? c.segments.length - 1 : q.kind === 'numberline' ? 1 : c.pickCount;
  const answered = q.kind === 'numberline' ? Number(object(value) && finite(value.position)) : Array.isArray(value) ? value.filter((v) => v !== '').length : 0;
  return { answered, total };
}

export function gradeActivity(q, value) {
  if (!validActivityResponse(q, value) || !activityProgress(q, value).answered) return false;
  if (q.kind === 'numberline') return Math.abs(value.position - q.answer) <= q.config.tolerance + 1e-9;
  if (['hotspots', 'bughunt'].includes(q.kind)) return value.length === q.answer.length && q.answer.every((v) => value.includes(v));
  return value.every((v, i) => v === q.answer[i]);
}

export function validateActivity(q) {
  const c = q.config;
  if (q.kind === 'pairs') {
    assert(exact(c, ['left', 'right']) && cards(c.left, 2, 6) && cards(c.right, 2, 6) && c.left.length === c.right.length, 'Pairs need 2–6 cards on each side with unique safe IDs');
    assert(validActivityResponse(q, q.answer) && q.answer.every(Boolean), 'Each pair needs one distinct partner');
    assert(!c.right.every((item, i) => item.id === q.answer[i]), 'Pair partners must start shuffled');
  } else if (q.kind === 'cloze') {
    assert(exact(c, ['segments', 'options']) && Array.isArray(c.segments) && c.segments.length >= 3 && c.segments.length <= 7 && c.segments.every((s) => typeof s === 'string' && s.length <= 400) && c.segments.some((s) => s.trim()), 'Word-bank puzzles need 2–6 blanks between text segments');
    assert(cards(c.options, c.segments.length - 1, 10), 'Word bank needs enough unique tokens for every blank (maximum 10)');
    assert(validActivityResponse(q, q.answer) && q.answer.every(Boolean), 'Every blank needs a distinct token');
    assert(!q.answer.every((answer, i) => c.options[i].id === answer), 'Word bank must start shuffled');
  } else if (q.kind === 'hotspots') {
    assert(exact(c, ['nodes', 'edges', 'pickCount']) && Array.isArray(c.nodes) && c.nodes.length >= 3 && c.nodes.length <= 8, 'Diagram needs 3–8 nodes');
    assert(c.nodes.every((n) => exact(n, ['id', 'label', 'x', 'y']) && id(n.id) && text(n.label, 100) && finite(n.x) && finite(n.y) && n.x >= 10 && n.x <= 90 && n.y >= 12 && n.y <= 88) && unique(c.nodes.map((n) => n.id)), 'Diagram nodes need safe IDs, labels and visible coordinates');
    assert(c.nodes.every((n, i) => c.nodes.slice(i + 1).every((other) => Math.abs(n.x - other.x) >= 24 || Math.abs(n.y - other.y) >= 25)), 'Space diagram nodes apart to keep touch targets distinct');
    assert(Array.isArray(c.edges) && c.edges.length <= 12 && c.edges.every((e) => exact(e, ['from', 'to']) && e.from !== e.to && [e.from, e.to].every((v) => c.nodes.some((n) => n.id === v))) && unique(c.edges.map((e) => `${e.from}:${e.to}`)), 'Diagram edges must reference distinct existing nodes');
    assert(Number.isInteger(c.pickCount) && c.pickCount >= 1 && c.pickCount < c.nodes.length, 'Choose fewer hotspots than the total node count');
    assert(validActivityResponse(q, q.answer) && q.answer.length === c.pickCount, 'Diagram answer must contain exactly pickCount node IDs');
  } else if (q.kind === 'bughunt') {
    assert(exact(c, ['language', 'lines', 'pickCount']) && text(c.language, 30) && Array.isArray(c.lines) && c.lines.length >= 3 && c.lines.length <= 18 && c.lines.every((line) => typeof line === 'string' && line.length <= 240 && !/[\r\n]/.test(line)), 'Code detective needs a language and 3–18 bounded single lines of code');
    assert(Number.isInteger(c.pickCount) && c.pickCount >= 1 && c.pickCount <= Math.min(4, c.lines.length - 1), 'Select 1–4 faulty lines');
    assert(validActivityResponse(q, q.answer) && q.answer.length === c.pickCount, 'Faulty line numbers must exist and match pickCount');
  } else if (q.kind === 'numberline') {
    assert(exact(c, ['min', 'max', 'step', 'unit', 'tolerance']) && finite(c.min) && finite(c.max) && Math.abs(c.min) <= 1000000 && Math.abs(c.max) <= 1000000 && c.max > c.min && finite(c.step) && c.step >= 0.000001 && (c.max - c.min) / c.step >= 2 && (c.max - c.min) / c.step <= 1000, 'Number line needs a finite range with 2–1000 steps of at least 0.000001');
    assert(onGrid(c.max, c) && typeof c.unit === 'string' && c.unit.length <= 30 && finite(c.tolerance) && c.tolerance >= 0 && c.tolerance < (c.max - c.min) / 4 && onGrid(q.answer, c), 'Number-line solution must be reachable on the step grid, with a bounded tolerance');
  } else throw new Error('Unknown activity template');
  return q;
}
