export const MAX_FORMATTED_LENGTH = 20000;
const escaped = (source, index) => {
  let count = 0;
  while (index > 0 && source[--index] === '\\') count++;
  return count % 2 === 1;
};

function closingDelimiter(source, delimiter, start, multiline = false) {
  let index = source.indexOf(delimiter, start);
  while (index !== -1) {
    if (!multiline && source.slice(start, index).includes('\n')) return -1;
    if (!escaped(source, index)) return index;
    index = source.indexOf(delimiter, index + delimiter.length);
  }
  return -1;
}

function obviousEquation(line) {
  const value = line.trim();
  if (/\\[()[\]]/.test(value)) return false;
  if (!value || value.length > 300 || /[`$;"'<>#]|=>|https?:/.test(value)) return false;
  if (!/[=]|\\(?:frac|sqrt|sum|int|lim|begin|angle)\b/.test(value)) return false;
  // Full mathematical lines only. Do not reinterpret assignments, prose, or monetary amounts.
  const words = value.replace(/\\[a-zA-Z]+/g, '').match(/[a-zA-Z]{3,}/g) || [];
  if (words.some((word) => !['sin', 'cos', 'tan', 'log', 'sqrt', 'exp', 'abs'].includes(word))) return false;
  let depth = 0;
  for (const char of value) { if (char === '{') depth++; if (char === '}') depth--; if (depth < 0) return false; }
  return depth === 0 && /^[\w\s\\{}()[\].,+\-*/^=|:!∑√πθλΔΩ≤≥±×÷]+$/u.test(value);
}

function inlineDollarMath(body, next) {
  if (!body || body.trim() !== body || /[\n`]/.test(body) || /[\p{L}\p{N}]/u.test(next || ' ')) return false;
  if (/^\d[\d.,]*\s+(?:and|to|or|per|each|for|a)\b/i.test(body)) return false;
  return /^[a-zA-Zα-ωΑ-Ω]$/u.test(body) || /\\[a-zA-Z]+|[=^_{}+*/<>]|\d/.test(body);
}

function mathBody(body) {
  // Common legacy output uses escaped newlines or math-only unit commands in text mode.
  // Keep these presentation repairs inside equations, never inside source code.
  return body.replace(/\\n(?=[^a-zA-Z]|$)/g, '\n').replace(/\\text\{([^{}]*)\}/g, (_, text) =>
    `\\text{${text.replace(/\\(Omega|mu|pm|times|cdot)\b/g, (_match, command) => `}\\${command}\\text{`)}}`);
}

// Normalize only display text. Original strings remain untouched in storage and scoring.
// A scanner protects fenced/indented/inline code before applying small math regexes.
export function normalizeAssessmentContent(input, { onMath = () => {}, onIssue = () => {} } = {}) {
  const source = typeof input === 'string' ? input.replace(/\r\n?/g, '\n') : '';
  if (source.length > MAX_FORMATTED_LENGTH) return source;
  const trimmed = source.trim();
  // Strong whole-snippet signatures only; mixed prose should use explicit code fences.
  const language = /^(?:(?:export|async)\s+)*(?:function\s+[\w$]+\s*\(|(?:const|let|var)\s+[\w$]+\s*=)/.test(trimmed) ? 'javascript'
    : /^(?:async\s+)?def\s+\w+\s*\(/.test(trimmed) ? 'python'
      : /^SELECT\s+[\w*.,()\s]+\s+FROM\s+[\w.]+(?:[;\s]|$)/.test(trimmed) ? 'sql'
        : /^<\/?[a-zA-Z][^<>\n]*\/?\s*>$/.test(trimmed) ? 'html' : '';
  if (language) {
    const fence = '`'.repeat(Math.max(3, ...Array.from(source.matchAll(/`+/g), (match) => match[0].length + 1)));
    return `${fence}${language}\n${source}\n${fence}`;
  }
  let out = '';
  let fence = null;
  for (let i = 0; i < source.length;) {
    if (i === 0 || source[i - 1] === '\n') {
      const end = source.indexOf('\n', i);
      const stop = end === -1 ? source.length : end;
      const line = source.slice(i, stop);
      const marker = /^ {0,3}(?:> ?)*(?:[-*+] |\d+[.)] )?(`{3,}|~{3,})(.*)$/.exec(line);
      if (fence) {
        out += source.slice(i, end === -1 ? stop : stop + 1);
        if (marker && marker[1][0] === fence.char && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
        i = end === -1 ? stop : stop + 1; continue;
      }
      if (marker) {
        fence = { char: marker[1][0], length: marker[1].length };
        out += source.slice(i, end === -1 ? stop : stop + 1);
        i = end === -1 ? stop : stop + 1; continue;
      }
      if (/^(?: {4}|\t)/.test(line)) {
        out += source.slice(i, end === -1 ? stop : stop + 1);
        i = end === -1 ? stop : stop + 1; continue;
      }
      if (obviousEquation(line)) {
        const body = mathBody(line.trim());
        onMath(body);
        out += `\n$$\n${body}\n$$\n`;
        i = end === -1 ? stop : stop + 1; continue;
      }
    }
    if (source[i] === '`') {
      const run = /^`+/.exec(source.slice(i))[0];
      let end = source.indexOf(run, i + run.length);
      while (end !== -1 && (source[end - 1] === '`' || source[end + run.length] === '`')) end = source.indexOf(run, end + run.length);
      if (end !== -1) { out += source.slice(i, end + run.length); i = end + run.length; continue; }
      out += run; i += run.length; continue;
    }
    if (source[i] === '\\') {
      const opener = source.slice(i, i + 2);
      if (opener === '\\(' || opener === '\\[') {
        const block = opener === '\\[';
        let end = closingDelimiter(source, block ? '\\]' : '\\)', i + 2, block);
        const nested = closingDelimiter(source, opener, i + 2, block);
        // Never consume a second equation (and intervening prose) as this one's body.
        if (nested !== -1 && (end === -1 || nested < end)) end = -1;
        if (end !== -1 && end > i + 2) {
          const body = mathBody(source.slice(i + 2, end));
          onMath(body);
          out += block ? `\n$$\n${body}\n$$\n` : `$$${body}$$`;
          i = end + 2; continue;
        }
        // Preserve an unmatched delimiter visibly instead of swallowing following prose.
        onIssue(`Unclosed math delimiter ${opener}. Use paired $...$ or $$...$$ delimiters; prefer plain text for units.`);
        out += '\\\\' + source[i + 1]; i += 2; continue;
      }
      if (opener === '\\)' || opener === '\\]') onIssue(`Unexpected math closing delimiter ${opener}`);
      if (opener === '\\\\' && /[()[\]]/.test(source[i + 2] || '')) onIssue('Math delimiters are double-escaped. JSON-escape each backslash exactly once.');
      if (/^\\[0-9]/.test(source.slice(i))) onIssue('Invalid backslash-number escape in display text. Do not use a number in place of a math closing delimiter.');
      if (/^\\(?:text|mathrm|frac|sqrt|pm|Omega|alpha|beta|theta|sum|int)\b/.test(source.slice(i))) onIssue('LaTeX command outside math delimiters. Wrap the expression in $...$ or use plain text units.');
      out += source.slice(i, i + 2); i += 2; continue;
    }
    if (source[i] === '$') {
      const double = source[i + 1] === '$';
      const delimiter = double ? '$$' : '$';
      const end = closingDelimiter(source, delimiter, i + delimiter.length, double);
      const body = end < 0 ? '' : mathBody(source.slice(i + delimiter.length, end));
      if (end >= 0 && body && (double || inlineDollarMath(body, source[end + 1]))) {
        onMath(body);
        out += `$$${body}$$`; i = end + delimiter.length; continue;
      }
      if (double) onIssue('Unclosed or empty display math delimiter $$');
      out += double ? '\\$\\$' : '\\$'; i += delimiter.length; continue;
    }
    out += source[i++];
  }
  return out;
}
