// Compile a small arithmetic language into the existing bounded runtime tokens.
// No eval, property access, indexing, strings, statements or user-defined functions.
const binary = { '+': ['add', 1], '-': ['sub', 1], '*': ['mul', 2], '/': ['div', 2], '^': ['pow', 3] };
const arity = { abs: 1, sqrt: 1, sin: 1, cos: 1, log: 1, exp: 1, min: 2, max: 2, pow: 2 };
export function compileFormula(source) {
  if (typeof source !== 'string' || !source.trim() || source.length > 1000) throw new Error('Formula expression must be 1-1000 characters');
  const input = source.trim();
  const lex = /\s*(?:(\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)|(\$?[a-z][a-z0-9_]*)|([()+\-*/^,]))/y;
  const tokens = [];
  let position = 0;
  while (position < input.length) {
    lex.lastIndex = position;
    const match = lex.exec(input);
    if (!match) throw new Error(`Unsupported formula syntax at character ${position + 1}`);
    tokens.push(match[1] || match[2] || match[3]); position = lex.lastIndex;
    if (tokens.length > 150) throw new Error('Formula expression is too complex');
  }
  let cursor = 0;
  const expect = (value) => { if (tokens[cursor++] !== value) throw new Error(`Formula expected ${value}`); };
  function expression(min = 0, depth = 0) {
    if (depth > 24) throw new Error('Formula nesting exceeds 24 levels');
    let token = tokens[cursor++];
    let out;
    if (token === '-' || token === '+') {
      out = expression(3, depth + 1); if (token === '-') out.push('neg');
    } else if (token === '(') { out = expression(0, depth + 1); expect(')'); }
    else if (token && /^(?:\d|\.)/.test(token)) out = [token];
    else if (token && /^\$?[a-z][a-z0-9_]*$/.test(token)) {
      if (tokens[cursor] === '(') {
        if (!Object.hasOwn(arity, token)) throw new Error(`Unsupported formula function ${token}`);
        cursor++; out = expression(0, depth + 1);
        if (arity[token] === 2) { expect(','); out.push(...expression(0, depth + 1)); }
        expect(')'); out.push(token);
      } else out = [token.startsWith('$') ? token : `$${token}`];
    } else throw new Error('Formula expected a number, control ID or parenthesized expression');
    while (Object.hasOwn(binary, tokens[cursor]) && binary[tokens[cursor]][1] >= min) {
      token = tokens[cursor++];
      const [operation, precedence] = binary[token];
      out.push(...expression(precedence + (token === '^' ? 0 : 1), depth + 1), operation);
    }
    return out;
  }
  const result = expression();
  if (cursor !== tokens.length) throw new Error('Formula has unexpected trailing tokens');
  if (result.length > 48) throw new Error('Formula compiles to more than 48 operations/values');
  return result;
}

export function compileEngineExpressions(engine) {
  if (!engine || !Array.isArray(engine.metrics)) return engine;
  return { ...engine, metrics: engine.metrics.map((metric) => {
    if (!Object.hasOwn(metric, 'expression')) return metric;
    const { expression, ...rest } = metric;
    try { return { ...rest, tokens: compileFormula(expression) }; }
    catch (error) { throw new Error(`Metric ${metric.id}: ${error.message}`); }
  }) };
}
