import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { dynamicMeasurements, initialDynamicState } from '../../../../shared/dynamicEngine.js';
import RichContent from '../content/RichContent';

function NumericControl({ control, value, disabled, onChange }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return <div className="dynamic-number">
    <input aria-label={`${control.label} slider`} type="range" min={control.min} max={control.max} step={control.step} value={value || control.min} disabled={disabled} onChange={(e) => { setDraft(e.target.value); onChange(e.target.value); }} />
    <input aria-label={control.label} type="number" min={control.min} max={control.max} step={control.step} value={draft} disabled={disabled} onChange={(e) => { setDraft(e.target.value); if (e.target.validity.valid) onChange(e.target.value); }} onBlur={() => setDraft(value)} />
  </div>;
}
NumericControl.propTypes = { control: PropTypes.object.isRequired, value: PropTypes.string.isRequired, disabled: PropTypes.bool, onChange: PropTypes.func.isRequired };

export default function DynamicWorkbench({ config, value, onChange, disabled }) {
  const engine = config.engine;
  const state = value || initialDynamicState(engine);
  const measurements = dynamicMeasurements(engine, state);
  return <>
    <div className="lab-goal"><strong>{engine.title}</strong><RichContent text={config.instructions} /></div>
    <div className="lab-controls">
      {engine.controls.map((control) => {
        const change = (next) => onChange({ ...state, [control.id]: next });
        return <div className="dynamic-field" key={control.id}>
          <span><RichContent text={control.label} inline />{control.unit ? ` (${control.unit})` : ''}</span>
          {control.type === 'number' && <NumericControl key={`${control.id}:${value === ''}`} control={control} value={state[control.id]} disabled={disabled} onChange={change} />}
          {control.type === 'choice' && <select aria-label={control.label} value={state[control.id]} disabled={disabled} onChange={(e) => change(e.target.value)}><option value="">Choose an option</option>{control.options.map((option) => <option key={option}>{option}</option>)}</select>}
          {control.type === 'toggle' && <button type="button" className="lab-switch" disabled={disabled} aria-label={control.label} aria-pressed={state[control.id] === 'true'} onClick={() => change(state[control.id] === 'true' ? 'false' : 'true')}>{state[control.id] === 'true' ? 'On' : 'Off'}</button>}
          {control.type === 'text' && <input aria-label={control.label} maxLength={500} value={state[control.id]} disabled={disabled} onChange={(e) => change(e.target.value)} placeholder="Enter your response" />}
        </div>;
      })}
    </div>
    {engine.metrics.length > 0 && <div className="lab-readouts" aria-live="polite">{engine.metrics.map((metric) => <div key={metric.id}><span>{metric.label}</span><strong>{measurements[metric.id] === null ? 'Undefined' : Number(measurements[metric.id].toPrecision(6)).toLocaleString()} <small>{metric.unit}</small></strong></div>)}</div>}
    {Object.values(measurements).some((v) => v === null) && <p className="lab-hint">This state has an undefined measurement. Check empty inputs, division by zero, or the formula’s domain.</p>}
    <details className="dynamic-model"><summary>Model and current inputs</summary><RichContent text={engine.description} /><table><tbody>{engine.controls.map((control) => <tr key={control.id}><th>{control.label}</th><td>{state[control.id] || 'Not entered'} {control.unit}</td></tr>)}</tbody></table></details>
  </>;
}
DynamicWorkbench.propTypes = { config: PropTypes.object.isRequired, value: PropTypes.oneOfType([PropTypes.string, PropTypes.object]), onChange: PropTypes.func.isRequired, disabled: PropTypes.bool };
