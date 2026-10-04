import katex from 'katex';
import { normalizeAssessmentContent, MAX_FORMATTED_LENGTH } from '../../shared/contentFormat.js';

export function validateContentFormat(value, field = 'Display text') {
  if (typeof value !== 'string') return;
  const fail = (message) => {
    throw Object.assign(new Error(`${field}: ${message}`), { generationValidation: true });
  };
  if (value.length > MAX_FORMATTED_LENGTH) fail('Content exceeds the rich-text rendering limit');
  normalizeAssessmentContent(value, {
    onIssue: fail,
    onMath: (body) => {
      try { katex.renderToString(body, { throwOnError: true, trust: false, strict: 'ignore', maxExpand: 200, maxSize: 10, macros: {} }); }
      catch { fail('Invalid LaTeX expression. Balance delimiters/braces, use supported commands, and JSON-escape each backslash once. Use plain text for values and units when possible.'); }
    },
  });
}

export function validateQuestionContent(question) {
  for (const key of ['questionText', 'explanation']) validateContentFormat(question[key], key);
  question.options?.forEach((value, index) => validateContentFormat(value, `options[${index}]`));
  validateContentFormat(question.config?.instructions, 'instructions');
  validateContentFormat(question.config?.engine?.description, 'engine description');
  for (const key of ['items', 'categories']) question.config?.[key]?.forEach((item, index) => validateContentFormat(item.label, `${key}[${index}].label`));
}
