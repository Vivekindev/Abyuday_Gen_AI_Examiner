import { Fragment, useEffect, useId, useState } from 'react';
import PropTypes from 'prop-types';
import { FiCheck, FiLink, FiMapPin, FiTarget, FiTerminal, FiType } from 'react-icons/fi';
import RichContent from '../content/RichContent';
import { activityProgress, validActivityResponse } from '../../../../shared/activityTemplates.js';
import './activities.css';

const arrayState = (value, size) => Array.isArray(value) ? value : Array(size).fill('');
const alphabet = (index) => String.fromCharCode(65 + index);

function Progress({ question, value, icon: Icon, instruction }) {
  const { answered, total } = activityProgress(question, value);
  return <div className="activity-mission">
    <span className="activity-mission-icon"><Icon aria-hidden="true" /></span>
    <div><strong>{instruction}</strong><span aria-live="polite">{answered} of {total} {question.kind === 'numberline' ? 'position' : 'selections'} saved</span></div>
    <progress value={answered} max={total} aria-label="Response progress" />
  </div>;
}

function Pairs({ question, value, onChange, disabled }) {
  const c = question.config;
  const state = arrayState(value, c.left.length);
  const [active, setActive] = useState(null);
  const connect = (partner) => {
    if (active === null || disabled) return;
    const next = state.map((id, i) => i === active ? partner : id === partner ? '' : id);
    onChange(next);
    const nextEmpty = next.findIndex((id) => !id);
    setActive(nextEmpty === -1 ? null : nextEmpty);
  };
  return <>
    <Progress question={question} value={value} icon={FiLink} instruction="Tap a concept, then connect its partner" />
    <div className="pair-board" style={{ gridTemplateRows: `repeat(${c.left.length}, minmax(86px, 1fr))` }}>
      <svg className="pair-wires" viewBox={`0 0 100 ${c.left.length * 100}`} preserveAspectRatio="none" aria-hidden="true">
        {state.map((id, i) => { const target = c.right.findIndex((r) => r.id === id); return target < 0 ? null : <path key={i} d={`M0 ${i * 100 + 50} C60 ${i * 100 + 50},40 ${target * 100 + 50},100 ${target * 100 + 50}`} />; })}
      </svg>
      {c.left.map((item, i) => <button key={item.id} type="button" className="pair-card" style={{ gridColumn: 1, gridRow: i + 1 }} aria-pressed={active === i} aria-label={`Concept ${alphabet(i)}: ${item.label}${state[i] ? ', connected' : ''}`} disabled={disabled} onClick={() => setActive(i)} data-linked={!!state[i]}>
        <span className="activity-card-index">{alphabet(i)}</span><RichContent inline text={item.label} />{state[i] && <FiCheck aria-hidden="true" />}
      </button>)}
      {c.right.map((item, i) => { const from = state.indexOf(item.id); return <button key={item.id} type="button" className="pair-card pair-partner" style={{ gridColumn: 3, gridRow: i + 1 }} disabled={disabled || active === null} aria-label={`Partner: ${item.label}${from >= 0 ? `, connected to ${alphabet(from)}` : ''}`} onClick={() => connect(item.id)} data-linked={from >= 0}>
        <RichContent inline text={item.label} /><span className="activity-card-index">{from < 0 ? '·' : alphabet(from)}</span>
      </button>; })}
    </div>
    <div className="activity-bottom"><span role="status">{active === null ? 'Select a concept to connect or change a pair.' : `Choose a partner for ${alphabet(active)}.`}</span><button type="button" className="text-link" disabled={disabled || active === null || !state[active]} onClick={() => onChange(state.map((id, i) => i === active ? '' : id))}>Clear selected pair</button></div>
  </>;
}

function Cloze({ question, value, onChange, disabled }) {
  const c = question.config;
  const state = arrayState(value, c.segments.length - 1);
  const [active, setActive] = useState(0);
  const choose = (id) => {
    const next = state.map((current, i) => i === active ? id : current === id ? '' : current);
    onChange(next);
    const empty = next.findIndex((current) => !current);
    if (empty >= 0) setActive(empty);
  };
  return <>
    <Progress question={question} value={value} icon={FiType} instruction="Build the explanation, one token at a time" />
    <div className="cloze-passage">{c.segments.map((segment, i) => <Fragment key={i}>
      <RichContent text={segment} inline />{' '}
      {i < state.length && <><button type="button" className="cloze-slot" aria-pressed={active === i} disabled={disabled} onClick={() => setActive(i)} aria-label={`Blank ${i + 1}: ${c.options.find((o) => o.id === state[i])?.label || 'empty'}`}>
        <small>{i + 1}</small>{state[i] ? <RichContent inline text={c.options.find((o) => o.id === state[i]).label} /> : <span>Choose a token</span>}
      </button>{' '}</>}
    </Fragment>)}</div>
    <div className="activity-bank" aria-label="Word bank">{c.options.map((option) => <button type="button" key={option.id} disabled={disabled} className="activity-token" data-used={state.includes(option.id)} onClick={() => choose(option.id)}><RichContent text={option.label} inline />{state.includes(option.id) && <span className="token-used">{state.indexOf(option.id) + 1}</span>}</button>)}</div>
    <div className="activity-bottom"><span aria-live="polite">Filling blank {active + 1}. Each token can be used once.</span><button className="text-link" type="button" disabled={disabled || !state[active]} onClick={() => onChange(state.map((id, i) => i === active ? '' : id))}>Clear this blank</button></div>
  </>;
}

function Hotspots({ question, value, onChange, disabled }) {
  const c = question.config;
  const state = Array.isArray(value) ? value : [];
  const marker = useId();
  const toggle = (id) => onChange(state.includes(id) ? state.filter((v) => v !== id) : [...state, id]);
  const locked = (id) => disabled || (state.length >= c.pickCount && !state.includes(id));
  return <>
    <Progress question={question} value={value} icon={FiMapPin} instruction={`Explore the map and select ${c.pickCount} ${c.pickCount === 1 ? 'node' : 'nodes'}`} />
    <div className="hotspot-map">
      <svg viewBox="0 0 600 360" preserveAspectRatio="none" aria-hidden="true"><defs><marker id={marker} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" /></marker></defs>
        {c.edges.map((edge) => { const a = c.nodes.find((n) => n.id === edge.from); const b = c.nodes.find((n) => n.id === edge.to); const dx = (b.x - a.x) * 6; const dy = (b.y - a.y) * 3.6; const length = Math.hypot(dx, dy); return <line key={`${edge.from}:${edge.to}`} x1={a.x * 6 + dx / length * 27} y1={a.y * 3.6 + dy / length * 27} x2={b.x * 6 - dx / length * 32} y2={b.y * 3.6 - dy / length * 32} markerEnd={`url(#${marker})`} />; })}
      </svg>
      {c.nodes.map((node, i) => <button type="button" className="hotspot-pin" key={node.id} style={{ left: `${node.x}%`, top: `${node.y}%` }} aria-label={`Map node ${i + 1}: ${node.label}`} aria-pressed={state.includes(node.id)} disabled={locked(node.id)} onClick={() => toggle(node.id)}>{i + 1}</button>)}
    </div>
    <div className="hotspot-legend">{c.nodes.map((node, i) => <button type="button" key={node.id} aria-pressed={state.includes(node.id)} disabled={locked(node.id)} onClick={() => toggle(node.id)}><span className="activity-card-index">{i + 1}</span><RichContent inline text={node.label} />{state.includes(node.id) && <FiCheck aria-hidden="true" />}</button>)}</div>
    <details className="map-connections"><summary>Read the connections</summary><ul>{c.edges.map((edge) => <li key={`${edge.from}:${edge.to}`}>{c.nodes.find((n) => n.id === edge.from).label} → {c.nodes.find((n) => n.id === edge.to).label}</li>)}{!c.edges.length && <li>These nodes have no connecting arrows.</li>}</ul></details>
    <p className="lab-hint">Use the numbered map or the labelled buttons. Select a chosen node again to remove it.</p>
  </>;
}

function BugHunt({ question, value, onChange, disabled }) {
  const c = question.config;
  const state = Array.isArray(value) ? value : [];
  return <>
    <Progress question={question} value={value} icon={FiTerminal} instruction={`Find ${c.pickCount} faulty ${c.pickCount === 1 ? 'line' : 'lines'}`} />
    <div className="detective-editor"><div className="detective-toolbar"><span className="editor-dots" aria-hidden="true"><i /><i /><i /></span><span>{c.language}</span><span>Inspect & select</span></div>
      <div className="detective-lines">{c.lines.map((line, i) => <button type="button" className="code-line" key={i} aria-pressed={state.includes(i + 1)} aria-label={`Line ${i + 1}: ${line || 'blank'}`} disabled={disabled || (state.length >= c.pickCount && !state.includes(i + 1))} onClick={() => onChange(state.includes(i + 1) ? state.filter((n) => n !== i + 1) : [...state, i + 1])}><span className="code-line-number">{i + 1}</span><code>{line || ' '}</code><span className="code-line-check">{state.includes(i + 1) ? <FiCheck aria-hidden="true" /> : ''}</span></button>)}</div>
    </div>
    <p className="lab-hint" aria-live="polite">{state.length ? `Selected ${state.length === 1 ? 'line' : 'lines'} ${[...state].sort((a, b) => a - b).join(', ')}. Click again to unmark.` : 'Follow the code, then mark the lines that cause the described problem.'}</p>
  </>;
}

function NumberLine({ question, value, onChange, disabled }) {
  const c = question.config;
  const midpoint = Number((c.min + Math.round((c.max - c.min) / c.step / 2) * c.step).toFixed(10));
  const position = value && value.position !== undefined ? value.position : midpoint;
  const [draft, setDraft] = useState(String(position));
  useEffect(() => setDraft(String(position)), [position]);
  const commit = (next) => { const answer = { position: Number(Number(next).toFixed(10)) }; if (validActivityResponse(question, answer)) onChange(answer); };
  const percent = (position - c.min) / (c.max - c.min) * 100;
  return <>
    <Progress question={question} value={value} icon={FiTarget} instruction="Solve it, then place your marker" />
    <div className="numberline-stage"><div className="numberline-value"><span>{value === '' || !value ? 'Preview position' : 'Your position'}</span><strong>{position}<small>{c.unit}</small></strong></div>
      <div className="numberline-track"><span className="numberline-marker" style={{ left: `${percent}%` }} /><div className="numberline-ticks">{Array.from({ length: 5 }, (_, i) => <span key={i}>{Number((c.min + (c.max - c.min) * i / 4).toPrecision(5))}</span>)}</div></div>
      <input className="numberline-slider" aria-label={`Answer position${c.unit ? ` in ${c.unit}` : ''}`} type="range" min={c.min} max={c.max} step={c.step} value={position} disabled={disabled} onChange={(e) => commit(e.target.value)} />
      <div className="numberline-controls"><button type="button" aria-label="Move one step left" disabled={disabled || position <= c.min} onClick={() => commit(position - c.step)}>−</button><label>Exact position<input type="number" min={c.min} max={c.max} step={c.step} value={draft} disabled={disabled} onChange={(e) => { setDraft(e.target.value); if (e.target.value !== '' && e.target.validity.valid) commit(e.target.value); }} onBlur={() => setDraft(String(position))} /></label><button type="button" aria-label="Move one step right" disabled={disabled || position >= c.max} onClick={() => commit(position + c.step)}>+</button></div>
      <button type="button" className="activity-token numberline-confirm" disabled={disabled} onClick={() => commit(position)}><FiMapPin aria-hidden="true" />Use this position</button>
    </div>
    <p className="lab-hint">Step size: {c.step} {c.unit}. Allowed difference: ±{c.tolerance} {c.unit}. Drag the slider, use arrow keys, or type a value.</p>
  </>;
}

const renderers = { pairs: Pairs, cloze: Cloze, hotspots: Hotspots, bughunt: BugHunt, numberline: NumberLine };
const rendererProps = { question: PropTypes.object.isRequired, value: PropTypes.oneOfType([PropTypes.string, PropTypes.object, PropTypes.array]), onChange: PropTypes.func.isRequired, disabled: PropTypes.bool };
Pairs.propTypes = rendererProps;
Cloze.propTypes = rendererProps;
Hotspots.propTypes = rendererProps;
BugHunt.propTypes = rendererProps;
NumberLine.propTypes = rendererProps;
Progress.propTypes = { question: PropTypes.object.isRequired, value: rendererProps.value, icon: PropTypes.elementType.isRequired, instruction: PropTypes.string.isRequired };
export default function ActivityQuestion(props) { const Renderer = renderers[props.question.kind]; return <Renderer {...props} />; }
ActivityQuestion.propTypes = rendererProps;

export function ActivitySolution({ question: q }) {
  if (q.kind === 'numberline') return <p>Target position: <strong>{q.answer} {q.config.unit}</strong></p>;
  if (q.kind === 'bughunt') return <p>Faulty lines: <strong>{q.answer.join(', ')}</strong></p>;
  const labels = q.kind === 'pairs' ? q.answer.map((id, i) => `${q.config.left[i].label} → ${q.config.right.find((r) => r.id === id).label}`)
    : q.kind === 'cloze' ? q.answer.map((id, i) => `Blank ${i + 1}: ${q.config.options.find((o) => o.id === id).label}`)
      : q.answer.map((id) => q.config.nodes.find((n) => n.id === id).label);
  return <ul>{labels.map((label, i) => <li key={i}><RichContent text={label} inline /></li>)}</ul>;
}
ActivitySolution.propTypes = { question: PropTypes.object.isRequired };
