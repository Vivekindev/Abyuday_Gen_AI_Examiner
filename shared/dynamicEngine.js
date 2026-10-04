// A bounded data interpreter, shared by the UI and server. No eval or generated code.
export const DYNAMIC_RUNTIME_VERSION = 1;
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const label = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const keys = (v, expected) => isObject(v) && Object.keys(v).length === expected.length && expected.every((key) => Object.hasOwn(v, key));
const ensure = (condition, message) => { if (!condition) throw new Error(message); };
const identifier = (v) => typeof v === 'string' && /^[a-z][a-z0-9_]{0,31}$/.test(v) && !['constructor', 'prototype', '__proto__'].includes(v);
const numericToken = (v) => typeof v === 'string' && /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(v) && Number.isFinite(Number(v)) && Math.abs(Number(v)) <= 1e12;
const operators = {
  add: [2, (a, b) => a + b], sub: [2, (a, b) => a - b], mul: [2, (a, b) => a * b],
  div: [2, (a, b) => b === 0 ? NaN : a / b], pow: [2, (a, b) => Math.abs(b) <= 12 ? Math.pow(a, b) : NaN],
  min: [2, Math.min], max: [2, Math.max], abs: [1, Math.abs], sqrt: [1, Math.sqrt],
  sin: [1, Math.sin], cos: [1, Math.cos], log: [1, Math.log], exp: [1, Math.exp], neg: [1, (a) => -a],
};

export function evaluateTokens(tokens, values) {
  const stack = [];
  for (const token of tokens) {
    if (token.startsWith('$')) {
      const value = values[token.slice(1)];
      if (!finite(value)) return null;
      stack.push(value);
    } else if (numericToken(token)) stack.push(Number(token));
    else if (Object.hasOwn(operators, token)) {
      const [arity, evaluate] = operators[token];
      if (stack.length < arity) return null;
      const value = evaluate(...stack.splice(-arity));
      if (!finite(value) || Math.abs(value) > 1e15) return null;
      stack.push(value);
    } else return null;
  }
  return stack.length === 1 ? stack[0] : null;
}

function validControlValue(control, value, allowEmpty = true) {
  if (typeof value !== 'string' || value.length > 500) return false;
  if (value === '') return allowEmpty;
  if (control.type === 'number') {
    if (!numericToken(value)) return false;
    const n = Number(value);
    return n >= control.min && n <= control.max && Math.abs((n - control.min) / control.step - Math.round((n - control.min) / control.step)) < 1e-6;
  }
  if (control.type === 'choice') return control.options.includes(value);
  if (control.type === 'toggle') return ['true', 'false'].includes(value);
  return control.type === 'text';
}

export function initialDynamicState(engine) {
  return Object.fromEntries(engine.controls.map((control) => [control.id, control.initial]));
}

export function validDynamicResponse(engine, answer) {
  return keys(answer, engine.controls.map((control) => control.id)) && engine.controls.every((control) => validControlValue(control, answer[control.id]));
}

export function dynamicMeasurements(engine, answer) {
  const values = {};
  for (const control of engine.controls) {
    const value = answer[control.id];
    values[control.id] = value === '' ? null : control.type === 'number' && numericToken(value) ? Number(value) : control.type === 'toggle' ? (value === 'true' ? 1 : 0) : null;
  }
  for (const metric of engine.metrics) values[metric.id] = evaluateTokens(metric.tokens, values);
  return Object.fromEntries(engine.metrics.map((metric) => [metric.id, values[metric.id]]));
}

export function validateEngineDefinition(engine) {
  ensure(keys(engine, ['key', 'title', 'description', 'version', 'minutes', 'controls', 'metrics']), 'Invalid engine fields');
  ensure(typeof engine.key === 'string' && /^[a-z][a-z0-9-]{2,63}$/.test(engine.key), 'Use a stable lowercase engine key');
  ensure(label(engine.title, 100) && label(engine.description, 1200) && engine.version === DYNAMIC_RUNTIME_VERSION && Number.isInteger(engine.minutes) && engine.minutes >= 1 && engine.minutes <= 10, 'Invalid engine metadata');
  ensure(Array.isArray(engine.controls) && engine.controls.length >= 1 && engine.controls.length <= 12 && Array.isArray(engine.metrics) && engine.metrics.length <= 8, 'Engine supports 1–12 controls and up to 8 measurements');
  const ids = new Set();
  const numericIds = new Set();
  for (const control of engine.controls) {
    ensure(keys(control, ['id', 'label', 'type', 'unit', 'min', 'max', 'step', 'initial', 'options']), 'Invalid control fields');
    ensure(identifier(control.id) && !ids.has(control.id) && label(control.label, 150) && typeof control.unit === 'string' && control.unit.length <= 30, 'Invalid or duplicate control id/label');
    ensure(['number', 'choice', 'toggle', 'text'].includes(control.type), 'Unsupported control type');
    const path = `Control ${control.id}`;
    ensure([control.min, control.max, control.step].every(finite), `${path}: min, max and step must be finite numbers`);
    ensure(control.min >= -1e6 && control.max <= 1e6, `${path}: bounds must be within [-1000000,1000000]; use scaled units`);
    ensure(control.max > control.min, `${path}: max must be greater than min`);
    ensure(control.step > 0, `${path}: step must be positive`);
    ensure((control.max - control.min) / control.step <= 100000 + 1e-6, `${path}: (max-min)/step exceeds 100000; narrow the range or choose a larger step. min=${control.min}, max=${control.max}, step=${control.step}`);
    ensure(Array.isArray(control.options) && control.options.length <= 12 && control.options.every((s) => label(s, 150)) && new Set(control.options).size === control.options.length, 'Invalid choices');
    ensure(control.type !== 'choice' || control.options.length >= 2, 'Choice controls need at least two options');
    ensure(validControlValue(control, control.initial, control.type === 'text' || control.type === 'choice'), `${path}: invalid initial value; number must be within bounds and aligned to min + n*step`);
    ids.add(control.id);
    if (['number', 'toggle'].includes(control.type)) numericIds.add(control.id);
  }
  for (const metric of engine.metrics) {
    ensure(keys(metric, ['id', 'label', 'unit', 'tokens']) && identifier(metric.id) && !ids.has(metric.id) && label(metric.label, 150) && typeof metric.unit === 'string' && metric.unit.length <= 30, 'Invalid metric fields');
    ensure(Array.isArray(metric.tokens) && metric.tokens.length > 0 && metric.tokens.length <= 48, 'Formula must have 1–48 tokens');
    let depth = 0;
    for (const token of metric.tokens) {
      ensure(typeof token === 'string' && token.length <= 40, 'Invalid formula token');
      if (numericToken(token) || (token.startsWith('$') && numericIds.has(token.slice(1)))) depth++;
      else {
        ensure(Object.hasOwn(operators, token) && depth >= operators[token][0], 'Formula has an unknown reference, operation or missing operand');
        depth += 1 - operators[token][0];
      }
    }
    ensure(depth === 1, 'Formula must produce exactly one number');
    ids.add(metric.id); numericIds.add(metric.id);
  }
  ensure(Object.values(dynamicMeasurements(engine, initialDynamicState(engine))).every(finite), 'Measurements must be defined at the starting state');
  return engine;
}

export function gradeDynamicQuestion(question, answer) {
  const engine = question.config.engine;
  if (!validDynamicResponse(engine, answer)) return false;
  const measured = dynamicMeasurements(engine, answer);
  return question.checks.every((check) => {
    const control = engine.controls.find((c) => c.id === check.source);
    if (!control || control.type === 'number') {
      const actual = control ? (answer[control.id] === '' ? null : Number(answer[control.id])) : measured[check.source];
      return finite(actual) && Math.abs(actual - Number(check.expected)) <= check.tolerance + 1e-9;
    }
    const actual = answer[control.id];
    return control.type === 'text' ? actual.trim().toLowerCase() === check.expected.trim().toLowerCase() : actual === check.expected;
  });
}

export function validateDynamicQuestion(question) {
  ensure(keys(question.config, ['engine', 'instructions']), 'Invalid dynamic task config');
  const engine = validateEngineDefinition(question.config.engine);
  ensure(label(question.config.instructions, 2000), 'Task instructions are required');
  ensure(Array.isArray(question.checks) && question.checks.length >= 1 && question.checks.length <= 12, 'Task needs 1–12 grading checks');
  const sources = new Set();
  for (const check of question.checks) {
    ensure(keys(check, ['source', 'expected', 'tolerance']) && !sources.has(check.source), 'Invalid or repeated grading check');
    const control = engine.controls.find((c) => c.id === check.source);
    const metric = engine.metrics.find((m) => m.id === check.source);
    ensure((control || metric) && label(check.expected, 500) && finite(check.tolerance) && check.tolerance >= 0 && check.tolerance <= 1e6, 'Invalid grading source/target');
    ensure(control && control.type !== 'number' ? validControlValue(control, check.expected, false) && check.tolerance === 0 : numericToken(check.expected), 'Invalid expected value');
    sources.add(check.source);
  }
  ensure(keys(question.answer, engine.controls.map((control) => control.id)), `A reachable, passing example solution is required: include each control ID exactly once (${engine.controls.map((control) => control.id).join(', ')}). Do not include computed metric IDs.`);
  for (const control of engine.controls) {
    ensure(validControlValue(control, question.answer[control.id], !['number', 'toggle'].includes(control.type)), `Solution control ${control.id} is invalid: use a legal value; for numbers use min=${control.min} + integer*step=${control.step}, up to max=${control.max}. Design the question around a reachable solution.`);
  }
  if (!gradeDynamicQuestion(question, question.answer)) {
    const measured = dynamicMeasurements(engine, question.answer);
    const error = new Error('A reachable, passing example solution is required: the supplied solution fails the grading checks');
    error.repairDetails = { solution: question.answer, measurements: measured, checks: question.checks };
    throw error;
  }
  if (gradeDynamicQuestion(question, initialDynamicState(engine))) {
    const error = new Error('Dynamic task must not start solved');
    error.code = 'DYNAMIC_START_SOLVED';
    error.repairDetails = { initial: initialDynamicState(engine), measurements: dynamicMeasurements(engine, initialDynamicState(engine)), checks: question.checks };
    throw error;
  }
  return question;
}
