import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import DOMPurify from 'dompurify';
import { FiExternalLink, FiGlobe } from 'react-icons/fi';
import './grounding.css';

function SearchSuggestions({ html }) {
  const host = useRef(null);
  useEffect(() => {
    const root = host.current.shadowRoot || host.current.attachShadow({ mode: 'open' });
    // Keep Google's widget styles local while removing executable provider HTML.
    root.innerHTML = DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true, svg: true },
      ADD_TAGS: ['style'], ADD_ATTR: ['target'], FORCE_BODY: true,
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    });
    root.querySelectorAll('a').forEach((link) => {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });
    return () => root.replaceChildren();
  }, [html]);
  return <div ref={host} className="grounding-suggestions" role="group" aria-label="Google Search suggestions" />;
}
SearchSuggestions.propTypes = { html: PropTypes.string.isRequired };

const validSource = (source) => {
  try {
    const url = new URL(source.url);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
};

export default function GroundingSources({ grounding, title = 'Sources' }) {
  const [expanded, setExpanded] = useState(false);
  const sources = (grounding?.sources || []).filter(validSource);
  const suggestions = (grounding?.searchSuggestions || []).filter((html) => typeof html === 'string' && html.trim());
  if (!sources.length && !suggestions.length) return null;
  return (
    <section className="grounding-sources" aria-label={title}>
      <h3><FiGlobe aria-hidden="true" />{title}</h3>
      {!!sources.length && <ul className="grounding-links">
        {(expanded ? sources : sources.slice(0, 5)).map((source) => <li key={source.url}>
          <a href={source.url} target="_blank" rel="noopener noreferrer">
            <span>{source.title || new URL(source.url).hostname}</span><FiExternalLink aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </li>)}
      </ul>}
      {sources.length > 5 && <button type="button" className="grounding-expand" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? 'Show fewer sources' : `View all ${sources.length} sources`}</button>}
      {suggestions.map((html) => <SearchSuggestions key={html} html={html} />)}
    </section>
  );
}
GroundingSources.propTypes = {
  title: PropTypes.string,
  grounding: PropTypes.shape({
    sources: PropTypes.arrayOf(PropTypes.shape({ url: PropTypes.string.isRequired, title: PropTypes.string })),
    searchSuggestions: PropTypes.arrayOf(PropTypes.string),
  }),
};
