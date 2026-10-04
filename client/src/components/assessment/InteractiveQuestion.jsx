import { useId } from 'react';
import PropTypes from 'prop-types';
import { interactionNames } from './interactionMeta';
import DynamicWorkbench from './DynamicWorkbench';
import RichContent from '../content/RichContent';
import './interactive.css';

function Circuit({ config: c, value, onChange, disabled }) {
  const state = value || c.initial;
  const change = (patch) => onChange({ ...state, ...patch });
  const resistance = state.topology === 'series' ? state.r1 + state.r2 : state.r1 * state.r2 / (state.r1 + state.r2);
  const current = state.closed ? c.voltage / resistance * 1000 : 0;
  return <>
    <div className="lab-goal"><strong>Target supply current: {c.targetCurrentMa} mA</strong><span>Allowed difference: ±{c.toleranceMa} mA · Ideal DC circuit</span></div>
    <svg className="circuit-canvas" viewBox="0 0 560 240" role="img" aria-label={`${state.topology} circuit with ${state.r1} and ${state.r2} ohm resistors, switch ${state.closed ? 'closed' : 'open'}`}>
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
        <path d="M65 100 V50 H160 M210 50 H270 M65 140 V205 H505 V50 H460" />
        <path d={state.closed ? 'M160 50 H210' : 'M160 50 L203 24'} />
        <circle cx="160" cy="50" r="4" /><circle cx="210" cy="50" r="4" />
        <path d="M43 100 H87 M51 115 H79 M43 125 H87 M51 140 H79" />
        {state.topology === 'series' ? <><path d="M270 50 l8 -10 12 20 12 -20 12 20 12 -20 12 20 8 -10 H365 l8 -10 12 20 12 -20 12 20 12 -20 12 20 8 -10 H460" /></>
          : <><path d="M270 50 V125 H315 M390 125 H460 V50 M270 50 H315 M390 50 H460" /><path d="M315 50 l8 -10 12 20 12 -20 12 20 12 -20 12 20 7 -10 M315 125 l8 -10 12 20 12 -20 12 20 12 -20 12 20 7 -10" /></>}
      </g>
      <g fill="currentColor" fontSize="14" textAnchor="middle">
        <text x="65" y="175">{c.voltage} V</text><text x="185" y="83">Switch</text>
        <text x={state.topology === 'series' ? 305 : 352} y="28">R1 · {state.r1} Ω</text>
        <text x={state.topology === 'series' ? 408 : 352} y={state.topology === 'series' ? 88 : 155}>R2 · {state.r2} Ω</text>
      </g>
    </svg>
    <div className="lab-readouts" aria-live="polite"><div><span>Supply current</span><strong>{current.toFixed(3)} <small>mA</small></strong></div><div><span>Equivalent resistance</span><strong>{resistance.toFixed(1)} <small>Ω</small></strong></div></div>
    <div className="lab-controls">
      {['r1', 'r2'].map((key) => <label key={key}>{key.toUpperCase()} resistance<select disabled={disabled} value={state[key]} onChange={(e) => change({ [key]: Number(e.target.value) })}>{c.resistorChoices.map((r) => <option value={r} key={r}>{r} Ω</option>)}</select></label>)}
      <label>Connection<select disabled={disabled} value={state.topology} onChange={(e) => change({ topology: e.target.value })}><option value="series">Series</option><option value="parallel">Parallel</option></select></label>
      <button type="button" className={`lab-switch ${state.closed ? 'is-on' : ''}`} aria-pressed={state.closed} disabled={disabled} onClick={() => change({ closed: !state.closed })}>{state.closed ? '● Closed circuit' : '○ Open circuit'}<small>Toggle switch</small></button>
    </div>
    <p className="lab-hint">Change the resistors, connection, and switch to reach the target. Every valid circuit that meets the current target earns credit.</p>
  </>;
}

function Graph({ config: c, value, onChange, disabled }) {
  const state = value || c.initial;
  const clip = useId();
  const px = (x) => 40 + (x + 5) * 48;
  const py = (y) => 270 - (y + 10) * 12;
  return <>
    <div className="lab-goal"><strong>Make your line pass through every target point</strong><span>Maximum vertical difference: {c.tolerance} · y = slope × x + intercept</span></div>
    <svg className="graph-canvas" viewBox="0 0 560 310" role="img" aria-label={`Graph of y = ${state.slope}x + ${state.intercept}. Target points: ${c.points.map((p) => `(${p.x}, ${p.y})`).join(', ')}`}>
      <defs><clipPath id={clip}><rect x="40" y="30" width="480" height="240" /></clipPath></defs>
      <g className="graph-grid">{Array.from({ length: 11 }, (_, i) => <g key={i}><line x1={40 + i * 48} y1="30" x2={40 + i * 48} y2="270" /><line x1="40" y1={30 + i * 24} x2="520" y2={30 + i * 24} /></g>)}</g>
      <g stroke="currentColor" opacity="0.5"><line x1="40" y1={py(0)} x2="530" y2={py(0)} /><line x1={px(0)} y1="20" x2={px(0)} y2="280" /></g>
      <g fill="currentColor" fontSize="11" textAnchor="middle">{[-5, -3, -1, 1, 3, 5].map((x) => <text key={x} x={px(x)} y="291">{x}</text>)}{[-10, -5, 0, 5, 10].map((y) => <text key={y} x="20" y={py(y) + 4}>{y}</text>)}<text x="540" y={py(0) + 4}>x</text><text x={px(0) + 15} y="19">y</text></g>
      <g clipPath={`url(#${clip})`}><line className="graph-line" strokeWidth="3" x1={px(-5)} y1={py(-5 * state.slope + state.intercept)} x2={px(5)} y2={py(5 * state.slope + state.intercept)} /></g>
      {c.points.map((p, i) => <g key={i}><circle className="graph-target" cx={px(p.x)} cy={py(p.y)} r="6" /><text fill="currentColor" fontSize="12" x={Math.min(470, px(p.x) + 10)} y={py(p.y) < 50 ? py(p.y) + 20 : py(p.y) - 12}>({p.x}, {p.y})</text></g>)}
    </svg>
    <div className="graph-key"><span>— Your line</span><span>● Target points</span><strong>y = {state.slope}x {state.intercept < 0 ? '−' : '+'} {Math.abs(state.intercept)}</strong></div>
    <div className="lab-controls">{['slope', 'intercept'].map((key) => <label key={key}>{key === 'slope' ? 'Slope' : 'Intercept'}: {state[key]}<input aria-label={key === 'slope' ? 'Slope' : 'Intercept'} type="range" min="-5" max="5" step="0.5" value={state[key]} disabled={disabled} onChange={(e) => onChange({ ...state, [key]: Number(e.target.value) })} /></label>)}</div>
    <p className="lab-hint">Use the sliders or their arrow keys. Targets: {c.points.map((p) => `(${p.x}, ${p.y})`).join(' · ')}.</p>
  </>;
}

function Ordering({ config: c, value, onChange, disabled }) {
  const order = value || c.items.map((item) => item.id);
  const move = (from, to) => { const next = [...order]; next.splice(to, 0, next.splice(from, 1)[0]); onChange(next); };
  return <>
    <div className="lab-goal"><strong>Arrange the steps in the requested order</strong><span>Drag a card, or use its up and down buttons.</span></div>
    <ol className="sequence-list">{order.map((id, index) => <li key={id} draggable={!disabled} onDragStart={(e) => e.dataTransfer.setData('text/plain', String(index))} onDragOver={(e) => { if (!disabled) e.preventDefault(); }} onDrop={(e) => { e.preventDefault(); const raw = e.dataTransfer.getData('text/plain'); const from = Number(raw); if (!disabled && raw !== '' && Number.isInteger(from) && from >= 0 && from < order.length) move(from, index); }}>
      <span className="sequence-number">{index + 1}</span><RichContent text={c.items.find((item) => item.id === id)?.label} inline className="sequence-label" /><div className="sequence-actions"><button type="button" aria-label={`Move step ${index + 1} up`} disabled={disabled || index === 0} onClick={() => move(index, index - 1)}>↑</button><button type="button" aria-label={`Move step ${index + 1} down`} disabled={disabled || index === order.length - 1} onClick={() => move(index, index + 1)}>↓</button></div>
    </li>)}</ol>
  </>;
}

function Matching({ config: c, value, onChange, disabled }) {
  const state = value || Object.fromEntries(c.items.map((item) => [item.id, '']));
  const assign = (id, category) => onChange({ ...state, [id]: category });
  return <>
    <div className="lab-goal"><strong>Place each item in a category</strong><span>Drag items onto a category, or use the selection under each item.</span></div>
    <div className="matching-items">{c.items.map((item) => <div className="matching-item" key={item.id} draggable={!disabled} onDragStart={(e) => e.dataTransfer.setData('text/plain', item.id)}><label><RichContent text={item.label} inline /><select value={state[item.id]} disabled={disabled} onChange={(e) => assign(item.id, e.target.value)}><option value="">Choose category</option>{c.categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label></div>)}</div>
    <div className="category-board">{c.categories.map((category) => <section key={category.id} onDragOver={(e) => { if (!disabled) e.preventDefault(); }} onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (!disabled && c.items.some((item) => item.id === id)) assign(id, category.id); }}><h4><RichContent text={category.label} inline /></h4>{c.items.filter((item) => state[item.id] === category.id).map((item) => <div className="category-card" key={item.id}><RichContent text={item.label} inline /></div>)}{!c.items.some((item) => state[item.id] === category.id) && <small>Drop items here</small>}</section>)}</div>
  </>;
}

const renderers = { circuit: Circuit, graph: Graph, ordering: Ordering, matching: Matching, dynamic: DynamicWorkbench };
const responseType = PropTypes.oneOfType([PropTypes.string, PropTypes.object, PropTypes.array]);
const rendererProps = { config: PropTypes.object.isRequired, value: responseType, onChange: PropTypes.func.isRequired, disabled: PropTypes.bool };
Circuit.propTypes = rendererProps;
Graph.propTypes = rendererProps;
Ordering.propTypes = rendererProps;
Matching.propTypes = rendererProps;
export default function InteractiveQuestion({ question, value, onChange, disabled = false, review = false }) {
  const Renderer = renderers[question.kind];
  if (!Renderer) return <p role="alert">This interaction is not supported by this version of the app.</p>;
  return <div className="interactive-question"><span className="interaction-badge">{interactionNames[question.kind]}</span><Renderer config={question.config} value={value} onChange={onChange} disabled={disabled} />
    {review && <div className="lab-review"><strong>Solution & reasoning</strong>{question.kind === 'ordering' && <ol>{question.answer.map((id) => <li key={id}><RichContent text={question.config.items.find((item) => item.id === id)?.label} inline /></li>)}</ol>}{question.kind === 'matching' && <ul>{question.config.items.map((item) => <li key={item.id}><RichContent text={item.label} inline /> → <RichContent text={question.config.categories.find((category) => category.id === question.answer[item.id])?.label} inline /></li>)}</ul>}<RichContent text={question.explanation} /></div>}
  </div>;
}
InteractiveQuestion.propTypes = { question: PropTypes.object.isRequired, value: responseType, onChange: PropTypes.func.isRequired, disabled: PropTypes.bool, review: PropTypes.bool };
