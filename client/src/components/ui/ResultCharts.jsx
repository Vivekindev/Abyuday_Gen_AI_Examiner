import { useState } from "react";
import { formatDate } from "../../lib/api";
import { percentageLabel } from "../../lib/results";

export function ScoreTrend({ rows }) {
  const recent = [...rows]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-10);
  const [selected, setSelected] = useState(null);
  const highlighted =
    recent.find((row) => row.id === selected) || recent[recent.length - 1];
  const x = (index) =>
    45 + (recent.length === 1 ? 270 : (index * 540) / (recent.length - 1));
  const y = (score) => 156 - score * 1.25;
  return (
    <section className="panel chart-panel">
      <div className="panel-heading">
        <div>
          <h2>Score trend</h2>
          <p>Last {recent.length} completed attempts</p>
        </div>
      </div>
      <div className="trend-chart">
        <svg
          viewBox="0 0 610 195"
          role="group"
          aria-label="Scores of recent completed attempts"
        >
          {[0, 25, 50, 75, 100].map((value) => (
            <g key={value}>
              <line
                x1="45"
                x2="585"
                y1={y(value)}
                y2={y(value)}
                className="chart-gridline"
              />
              <text
                x="30"
                y={y(value) + 4}
                textAnchor="end"
                className="chart-label"
              >
                {value}
              </text>
            </g>
          ))}
          <polyline
            points={recent
              .map((row, index) => `${x(index)},${y(row.percentage)}`)
              .join(" ")}
            fill="none"
            className="chart-line"
          />
          {recent.map((row, index) => (
            <g key={row.id}>
              <circle
                cx={x(index)}
                cy={y(row.percentage)}
                r="13"
                className="chart-hit"
                tabIndex={0}
                role="button"
                aria-label={`${row.testName}, ${percentageLabel(row.percentage)}, ${formatDate(row.date)}`}
                onFocus={() => setSelected(row.id)}
                onMouseEnter={() => setSelected(row.id)}
                onClick={() => setSelected(row.id)}
                onKeyDown={(event) => {
                  if (["Enter", " "].includes(event.key)) {
                    event.preventDefault();
                    setSelected(row.id);
                  }
                }}
              />
              <circle
                cx={x(index)}
                cy={y(row.percentage)}
                r={highlighted?.id === row.id ? "5" : "3.5"}
                className="chart-point"
                pointerEvents="none"
              />
            </g>
          ))}
          {recent.length > 0 && (
            <>
              <text x="45" y="185" className="chart-label">
                {formatDate(recent[0].date)}
              </text>
              <text x="585" y="185" textAnchor="end" className="chart-label">
                {formatDate(recent[recent.length - 1].date)}
              </text>
            </>
          )}
        </svg>
      </div>
      <div className="chart-caption" aria-live="polite">
        {highlighted && (
          <>
            <span>
              {highlighted.testName}
              {highlighted.name ? ` · ${highlighted.name}` : ""}
            </span>
            <strong>{percentageLabel(highlighted.percentage)}</strong>
          </>
        )}
      </div>
    </section>
  );
}
export function AnswerBreakdown({ summary }) {
  const items = [
    { name: "Correct", count: summary.correct, className: "bar-correct" },
    {
      name: summary.detailed ? "Incorrect" : "Other answers",
      count: summary.incorrect,
      className: "bar-incorrect",
    },
    ...(summary.detailed
      ? [
          {
            name: "Unanswered",
            count: summary.unanswered,
            className: "bar-unanswered",
          },
        ]
      : []),
  ];
  return (
    <section className="panel chart-panel">
      <div className="panel-heading">
        <div>
          <h2>Answer breakdown</h2>
          <p>{summary.total} questions across completed attempts</p>
        </div>
      </div>
      <div className="answer-distribution">
        <div className="stacked-bar" aria-hidden="true">
          {items.map((item) => (
            <span
              key={item.name}
              className={item.className}
              style={{
                width: `${summary.total ? (item.count / summary.total) * 100 : 0}%`,
              }}
            />
          ))}
        </div>
        <dl className="distribution-list">
          {items.map((item) => (
            <div key={item.name}>
              <dt>
                <i className={item.className} />
                {item.name}
              </dt>
              <dd>
                {item.count}
                <span>
                  {summary.total
                    ? Math.round((item.count / summary.total) * 100)
                    : 0}
                  %
                </span>
              </dd>
            </div>
          ))}
        </dl>
        {!summary.detailed && (
          <p className="field-hint">
            Older results combine incorrect and unanswered responses.
          </p>
        )}
      </div>
    </section>
  );
}
