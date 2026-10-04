import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { normalizeAssessmentContent, MAX_FORMATTED_LENGTH } from '../client/src/lib/contentFormat.js';
import RichContent from '../client/src/components/content/RichContent.js';
import { gradeAnswer } from '../functions/assessment/engines.js';
import { validateContentFormat, validateQuestionContent } from '../functions/assessment/contentValidation.js';
import { generateInteractiveAssessment } from '../functions/assessment/orchestrator.js';
import { interactionExamples } from '../client/src/components/assessment/examples.js';
const requireClient = createRequire(new URL('../client/package.json', import.meta.url));
const { createElement } = requireClient('react');
const { renderToStaticMarkup } = requireClient('react-dom/server');
const render = (text, inline = false) => renderToStaticMarkup(createElement(RichContent, { text, inline }));

const brokenCircuitText = String.raw`Design a DC circuit with \(12\text{ V}\5 to achieve \(15\text{ mA}\) within \(\pm 0.5\text{ mA}\5. Available: \([470, 1000, 2200, 4700, 10000]\5\ \Omega\).`;

test('broken ECA delimiters are rejected and cannot swallow the next valid equation', () => {
  assert.throws(() => validateContentFormat(brokenCircuitText, 'questionText'), /questionText: Unclosed math delimiter/);
  const html = render(brokenCircuitText);
  assert.match(html, /annotation encoding="application\/x-tex">15/);
  assert.match(html, /to achieve/);
  for (const source of [String.raw`\(x\5`, String.raw`\(x\badcommand\)`, String.raw`\(\frac{1}{2\)`, String.raw`\\(x\\)`]) assert.throws(() => validateContentFormat(source));
  assert.doesNotThrow(() => validateContentFormat('12 V, 15 mA, tolerance 0.5 mA.'));
});

test('legacy unit formatting and bare phasor options render without changing answer strings', () => {
  for (const source of [String.raw`\(12\text{ \Omega}\)`, String.raw`$47\text{ \mu F}$`, String.raw`\[x=1\n\]`, String.raw`5 \angle 15^{\circ}\text{ Ω}`]) {
    validateContentFormat(source);
    assert.match(render(source), /class="katex/);
    assert.doesNotMatch(render(source), /katex-error/);
  }
  const raw = String.raw`5 \angle 15^{\circ}\text{ Ω}`;
  const question = { options: [raw, 'B', 'C', 'D'], answer: raw };
  render(raw, true);
  assert.equal(gradeAnswer(question, raw), true);
});

test('format validation protects code and currency and covers all question display fields', () => {
  for (const source of ['```regex\n\\5 \\( \\text{\n```', 'Use `\\5` as a regex backreference.', 'The cost is $5 and $10.']) assert.doesNotThrow(() => validateContentFormat(source));
  assert.throws(() => validateQuestionContent({ questionText: 'Valid', options: [brokenCircuitText] }), /options\[0\]/);
  assert.throws(() => validateQuestionContent({ questionText: 'Valid', explanation: brokenCircuitText }), /explanation/);
  assert.throws(() => validateQuestionContent({ questionText: 'Valid', config: { instructions: brokenCircuitText } }), /instructions/);
});

test('generation repairs malformed math before accepting the question', async () => {
  const question = structuredClone(interactionExamples[0]);
  let calls = 0;
  const result = await generateInteractiveAssessment({ prompt: 'DC circuits', count: 1, difficulty: 5,
    savedPlan: { questions: [{ kind: 'circuit', domain: 'electronics', objective: 'Tune current' }] },
    generate: async ({ instructions, validate }) => {
      calls++;
      if (calls === 2) assert.match(instructions, /Unclosed math delimiter/);
      const value = [{ ...question, questionText: calls === 1 ? brokenCircuitText : question.questionText }];
      validate(value); return value;
    },
  });
  assert.equal(calls, 2); assert.equal(result.questions[0].questionText, question.questionText);
});

test('math delimiters and conservative standalone equations render as accessible math', () => {
  for (const source of [String.raw`Use \(x^2 + y^2 = z^2\).`, String.raw`\[\frac{1}{2}mv^2\]`, '$x^2$', '$$\nx^2\n$$', 'E = mc^2', String.raw`\frac{a}{b} = c`]) {
    const html = render(source);
    assert.match(html, /class="katex/);
    assert.match(html, /<math/);
    assert.match(html, /annotation encoding="application\/x-tex"/);
  }
  assert.match(render('Use $x$ and $y$.'), /katex/);
});

test('currency, escaped dollars, prose and identifiers remain ordinary text', () => {
  for (const source of ['The cost is $5 and $10 per month.', String.raw`Pay \$5 for this.`, 'Price = 25', 'file_name and snake_case', 'Select the answer from this list.', 'Revenue grew 10%.']) {
    assert.doesNotMatch(render(source), /class="katex/);
  }
  assert.match(render('The cost is $5 and $10 per month.'), /\$5 and \$10/);
  assert.doesNotMatch(render('Answer = 5'), /katex/);
});

test('fenced, indented and inline code protect dollars, backslashes and markup', () => {
  const code = '```javascript\nconst x = "$5";\n// \\(x^2\\)\nconst tag = "<script>";\n```';
  assert.equal(normalizeAssessmentContent(code), code);
  const html = render(code);
  assert.match(html, /hljs-keyword/);
  assert.doesNotMatch(html, /class="katex|<script>/);
  assert.match(html, /&lt;script&gt;/);
  const inline = 'Use `\\(x\\)` and `$5`.';
  assert.doesNotMatch(render(inline), /class="katex/);
  assert.equal(normalizeAssessmentContent('    x = 2\n    y = 3'), '    x = 2\n    y = 3');
  const multilineInline = '``first\nx = 2\nlast``';
  assert.equal(normalizeAssessmentContent(multilineInline), multilineInline);
  const quotedFence = '> ```python\n> price = "$5"\n> x = 2\n> ```';
  assert.equal(normalizeAssessmentContent(quotedFence), quotedFence);
});

test('legacy standalone code snippets get code typography without changing stored answers', () => {
  for (const [source, language] of [['const x = "$5";', 'javascript'], ['def square(x):\n    return x * x', 'python'], ['SELECT * FROM students;', 'sql'], ['<div>', 'html']]) {
    assert.match(render(source), new RegExp(`language-${language}`));
    assert.doesNotMatch(render(source), /class="katex/);
  }
  const q = { options: ['$x^2$', '**Bold**', '`code`', 'Plain'], answer: '$x^2$' };
  render(q.options[0]);
  assert.equal(gradeAnswer(q, '$x^2$'), true);
  assert.equal(gradeAnswer(q, 'x^2'), false);
});

test('headings, lists, tables, emphasis and semantic HTML are supported', () => {
  const html = render('## Task\n\n**Bold**, *italic*, ~~old~~ and H<sub>2</sub>O, x<sup>2</sup>, <u>underline</u>, <mark>note</mark>.\n\n1. First\n2. Second\n\n| A | B |\n| - | - |\n| 1 | 2 |');
  for (const tag of ['h3', 'strong', 'em', 'del', 'sub', 'sup', 'u', 'mark', 'ol', 'li', 'table', 'th', 'td']) assert.match(html, new RegExp(`<${tag}(?:>| )`));
  const inline = render('**A**\n\n```js\nlet x = 1;\n```', true);
  assert.match(inline, /^<span/);
  assert.doesNotMatch(inline, /<(?:div|p|pre|table|h\d|ul|ol|li)(?:>| )/);
});

test('untrusted HTML, links and LaTeX cannot add scripts, remote assets or arbitrary styling', () => {
  const html = render('<script>alert(1)</script>\n\n<b onclick="alert(1)" style="color:red">Bold</b> <img src="https://example.test/pixel" onerror="alert(2)" alt="Diagram">\n\n[bad](javascript:alert%281%29) [good](https://example.test)');
  assert.doesNotMatch(html, /<script|onclick=|onerror=|src=|style=|href="javascript:/);
  assert.match(html, /<b>Bold<\/b>/);
  assert.match(html, /\[Image: Diagram\]/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.doesNotMatch(render('[link](https://example.test)', true), /<a /);
  const math = render(String.raw`\(\href{javascript:alert(1)}{click}\) and \(\htmlStyle{background:url(https://example.test)}{x}\)`);
  assert.doesNotMatch(math, /href="javascript:|style="[^"]*url\(/);
});

test('invalid math, unknown code languages and oversized content remain readable', () => {
  assert.doesNotThrow(() => render(String.raw`\(\badcommand{x}\)`));
  assert.match(render(String.raw`\(\badcommand{x}\)`), /badcommand/);
  assert.doesNotMatch(render('Unclosed $x + 2'), /class="katex/);
  assert.match(render('Unclosed $x + 2'), /\$x \+ 2/);
  assert.match(render('```unlisted-language\nprint("hello")\n```'), /hello/);
  const long = '<script>' + 'x'.repeat(MAX_FORMATTED_LENGTH);
  const output = render(long);
  assert.match(output, /content-plain-fallback/); assert.doesNotMatch(output, /<script>/);
});
