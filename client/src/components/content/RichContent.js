import { createElement, memo } from 'react';
import PropTypes from 'prop-types';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { MAX_FORMATTED_LENGTH, normalizeAssessmentContent } from '../../lib/contentFormat.js';

const schema = {
  tagNames: ['p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u', 'del', 's', 'sub', 'sup', 'mark', 'small', 'kbd', 'pre', 'code', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div', 'img'],
  attributes: { a: ['href', 'title'], img: ['alt'], ol: ['start'], th: ['align'], td: ['align'], code: [['className', /^language-[a-zA-Z0-9_+-]+$/, 'math-inline', 'math-display']] },
  protocols: { href: ['http', 'https', 'mailto'] },
  strip: ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form', 'input', 'textarea', 'button', 'select'],
};

const contentOnly = (tag, className) => {
  function Element({ children }) { return createElement(tag, { className }, children); }
  Element.propTypes = { children: PropTypes.node };
  return Element;
};

function SafeLink({ href, children, title }) {
  return href ? createElement('a', { href, title, target: '_blank', rel: 'noopener noreferrer' }, children) : createElement('span', null, children);
}
SafeLink.propTypes = { href: PropTypes.string, children: PropTypes.node, title: PropTypes.string };
function ImageAlternative({ alt }) { return createElement('span', { className: 'content-image-alt' }, alt ? `[Image: ${alt}]` : '[Image]'); }
ImageAlternative.propTypes = { alt: PropTypes.string };

const blockComponents = {
  a: SafeLink, img: ImageAlternative,
  // A question can contain its own document headings without replacing the page hierarchy.
  h1: contentOnly('h3'), h2: contentOnly('h3'),
};
const inlineComponents = { ...blockComponents, a: contentOnly('span', 'content-link-label') };
for (const tag of ['p', 'div', 'pre', 'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td']) {
  inlineComponents[tag] = contentOnly('span', `content-inline-${tag}`);
}
inlineComponents.hr = () => createElement('br');

function RichContent({ text = '', inline = false, className = '' }) {
  const value = typeof text === 'string' ? text : '';
  const wrapper = inline ? 'span' : 'div';
  const props = { className: `rich-content ${inline ? 'rich-content-inline' : ''} ${className}`.trim(), dir: 'auto' };
  if (value.length > MAX_FORMATTED_LENGTH) return createElement(wrapper, { ...props, className: `${props.className} content-plain-fallback` }, value);
  return createElement(wrapper, props, createElement(Markdown, {
    remarkPlugins: [remarkGfm, [remarkMath, { singleDollarTextMath: false }]],
    // Sanitize raw model HTML before trusted renderers add their own math/highlight markup.
    rehypePlugins: [rehypeRaw, [rehypeSanitize, schema], [rehypeKatex, { trust: false, strict: 'ignore', maxExpand: 200, maxSize: 10, macros: {} }], [rehypeHighlight, { detect: false, ignoreMissing: true }]],
    components: inline ? inlineComponents : blockComponents,
  }, normalizeAssessmentContent(value)));
}
RichContent.propTypes = { text: PropTypes.string, inline: PropTypes.bool, className: PropTypes.string };
export default memo(RichContent);
