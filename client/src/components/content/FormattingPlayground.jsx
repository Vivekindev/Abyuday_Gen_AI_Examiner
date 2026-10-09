import { useState } from 'react';
import RichContent from './RichContent';

const example = String.raw`### Mixed assessment content
Find the **kinetic energy** when \(m = 2\) kg and \(v = 10\) m/s.

\[
E_k = \frac{1}{2}mv^2 = 100\text{ J}
\]

1. Read the inputs.
2. Explain *why speed is squared*.

| Quantity | Value |
| --- | --- |
| Mass | 2 kg |
| Speed | 10 m/s |

Water is H<sub>2</sub>O. Keep prices such as $5 and $10 as ordinary text.

CODE_FENCEjavascript
const energy = (mass, speed) => 0.5 * mass * speed ** 2;
console.log(energy(2, 10));
CODE_FENCE
`.replaceAll('CODE_FENCE', '```');

export default function FormattingPlayground() {
  const [source, setSource] = useState(example);
  return <section className="panel formatting-preview" aria-labelledby="formatting-preview-title">
    <div className="panel-heading"><div><h2 id="formatting-preview-title">Content formatting</h2><p>Preview equations, code, tables, and formatted text.</p></div></div>
    <div className="panel-padding formatting-preview-grid">
      <label className="field">Content<textarea value={source} maxLength={12000} onChange={(event) => setSource(event.target.value)} spellCheck={false} /></label>
      <div className="formatting-preview-output"><h3>Preview</h3><RichContent text={source} /></div>
    </div>
  </section>;
}
