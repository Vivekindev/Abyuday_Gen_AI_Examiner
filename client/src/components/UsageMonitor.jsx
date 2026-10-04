import { useState } from "react";
import PropTypes from 'prop-types';
import { FiArrowLeft, FiDownload, FiRefreshCw, FiSearch } from "react-icons/fi";
import { Button, EmptyState, ErrorNotice, LoadingState } from "./ui";
import useResource from "../hooks/useResource";
import {
  activityLabels,
  number,
  tokenTotal,
  duration,
  timestamp,
  downloadUsage,
} from "../lib/monitoring";
import "./usage-monitor.css";

const panes = [
  ["overview", "Overview"],
  ["users", "People"],
  ["activity", "Activity"],
  ["ai", "AI requests"],
  ["api", "API requests"],
];
function Pager({ data, page, setPage }) {
  return (
    data && (
      <div className="table-footer">
        <span>{number(data.total)} records</span>
        <div className="pagination">
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span>
            {page} / {data.pages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= data.pages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    )
  );
}
Pager.propTypes = { data: PropTypes.shape({ total: PropTypes.number, pages: PropTypes.number }), page: PropTypes.number.isRequired, setPage: PropTypes.func.isRequired };
function TokenChart({ rows }) {
  const max = Math.max(1, ...rows.map((row) => row.totalTokens));
  return (
    <section className="panel usage-trend">
      <div className="panel-heading">
        <h3>Daily token consumption</h3>
        <span className="field-hint">Days with calls · last 30 days · UTC</span>
      </div>
      {rows.length ? (
        <div
          className="usage-bars"
          role="list"
          aria-label="Reported tokens by day"
        >
          {rows.map((row) => (
            <div
              className="usage-bar-item"
              role="listitem"
              key={row._id}
              tabIndex={0}
              aria-label={`${row._id}: ${tokenTotal(row)} reported tokens, ${row.calls} requests`}
              title={`${row._id}: ${tokenTotal(row)} tokens · ${row.calls} calls`}
            >
              <strong>{tokenTotal(row)}</strong>
              <div className="usage-bar-track">
                <i
                  style={{
                    height: `${row.totalTokens ? Math.max(2, (row.totalTokens / max) * 100) : 0}%`,
                  }}
                />
              </div>
              <span>{row._id.slice(5)}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No AI requests in this period"
          description="New question generation and explanation requests will appear here."
        />
      )}
    </section>
  );
}
TokenChart.propTypes = { rows: PropTypes.array.isRequired };
UsageMonitor.propTypes = { teamId: PropTypes.string };

export default function UsageMonitor({ teamId }) {
  const base = teamId ? `/teams/${teamId}/monitoring` : "/admin/monitoring";
  const [days, setDays] = useState("30");
  const [pane, setPane] = useState("overview");
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("tokens");
  const [filter, setFilter] = useState("");
  const params = new URLSearchParams({
    days,
    ...(selected ? { userId: selected.id } : {}),
  });
  const summary = useResource(`${base}?${params}`, { interval: 30000 });
  const people = useResource(
    pane === "users"
      ? `${base}/users?${new URLSearchParams({ days, q: query, page: String(page), sort })}`
      : null,
    { interval: 30000 },
  );
  const events = useResource(
    ["activity", "ai", "api"].includes(pane)
      ? `${base}/events?${params}&${new URLSearchParams({ kind: pane, page: String(page), ...(pane === "activity" ? { action: filter } : { status: filter }) })}`
      : null,
    { interval: 30000 },
  );
  const data = summary.data;
  const rows = pane === "users" ? people : events;
  const changePane = (value) => {
    if (value === "users") setSelected(null);
    setPane(value);
    setPage(1);
    setFilter("");
  };
  const focusUser = (user) => {
    setSelected(user);
    changePane("overview");
  };
  const refresh = () => {
    summary.reload();
    if (pane === "users") people.reload();
    else events.reload();
  };
  const ai = data?.ai.summary;
  const api = data?.api.summary;
  return (
    <div className="usage-monitor">
      <div className="usage-heading">
        <div>
          <h2>{teamId ? "Team usage & activity" : "Usage & monitoring"}</h2>
          <p>
            {teamId
              ? "Generation usage and recorded activity within this team."
              : "Recorded AI consumption, user activity, and service performance."}
          </p>
        </div>
        <Button variant="secondary" icon={FiRefreshCw} onClick={refresh}>
          Refresh
        </Button>
      </div>
      <div className="usage-controls">
        <label className="field">
          Period
          <select
            value={days}
            onChange={(event) => {
              setDays(event.target.value);
              setPage(1);
            }}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All recorded</option>
          </select>
        </label>
        {selected && (
          <div className="usage-selected">
            <span>
              <strong>{selected.name}</strong>
              <small>{selected.email}</small>
            </span>
            <Button
              variant="secondary"
              icon={FiArrowLeft}
              onClick={() => {
                setSelected(null);
                setPage(1);
              }}
            >
              {teamId ? "Whole team" : "All users"}
            </Button>
          </div>
        )}
      </div>
      <ErrorNotice message={summary.error} onRetry={summary.reload} />
      <nav className="tabs" aria-label="Monitoring views">
        {panes.map(([key, label]) => (
          <button
            key={key}
            className={pane === key ? "active" : ""}
            aria-pressed={pane === key}
            onClick={() => changePane(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      {summary.loading && <LoadingState rows={3} />}
      {data && (
        <>
          <p className="usage-coverage">
            Recording since {timestamp(data.trackingSince)}. Historical token
            counts are unavailable. Activity is retained for 90 days and API
            metrics for 30 days.
          </p>
          {pane === "overview" && (
            <>
              <div className="stats-grid">
                {[
                  [
                    "Reported tokens",
                    tokenTotal(ai),
                    `${number(ai.measuredCalls)} of ${number(ai.calls)} calls have token totals`,
                  ],
                  [
                    "AI requests",
                    number(ai.calls),
                    `${number(ai.failed)} failed · ${number(ai.pending)} unfinished`,
                  ],
                  [
                    "AI response time",
                    duration(ai.averageMs),
                    `Maximum ${duration(ai.maxMs)}`,
                  ],
                  [
                    "API requests",
                    number(api.requests),
                    `${number(api.errors)} errors · ${duration(api.averageMs)} average`,
                  ],
                ].map(([label, value, note]) => (
                  <article className="stat-card" key={label}>
                    <span className="stat-top">{label}</span>
                    <strong className="stat-value">{value}</strong>
                    <span className="stat-note">{note}</span>
                  </article>
                ))}
              </div>
              {!!ai.pending && (
                <p className="notice notice-info">
                  Unfinished calls may be running or may have been interrupted
                  before their result was recorded.
                </p>
              )}
              <div className="usage-token-details">
                {[
                  ["promptTokens", "Input"],
                  ["outputTokens", "Output"],
                  ["thinkingTokens", "Thinking"],
                  ["cachedTokens", "Cached input"],
                  ["toolTokens", "Tool prompts"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <span>{label}</span>
                    <strong>{number(ai[key])}</strong>
                  </div>
                ))}
              </div>
              <p className="field-hint usage-token-note">
                Only provider-reported counts are summed. Cached input is
                included in input tokens. Retries count as separate calls.
                Unreported fields are excluded.
              </p>
              <TokenChart rows={data.ai.daily} />
              <div className="usage-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <h3>Models</h3>
                  </div>
                  {data.ai.models.length ? (
                    <ul className="usage-list">
                      {data.ai.models.map((row) => (
                        <li key={row._id}>
                          <div>
                            <strong>{row._id}</strong>
                            <small>
                              {number(row.calls)} calls · {number(row.failed)}{" "}
                              failed · {duration(row.averageMs)} average
                            </small>
                          </div>
                          <span>
                            {tokenTotal(row)}
                            <small>tokens</small>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="usage-empty">No model usage recorded.</p>
                  )}
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <h3>Usage by feature</h3>
                  </div>
                  {data.ai.operations.length ? (
                    <ul className="usage-list">
                      {data.ai.operations.map((row) => (
                        <li key={row._id}>
                          <div>
                            <strong>
                              {row._id === "questions"
                                ? "Question generation"
                                : row._id === 'planning' ? 'Assessment planning' : row._id === 'engine_build' ? 'Engine building' : "Answer explanations"}
                            </strong>
                            <small>
                              {number(row.calls)} calls ·{" "}
                              {number(row.measuredCalls)} with token totals
                            </small>
                          </div>
                          <span>
                            {tokenTotal(row)}
                            <small>tokens</small>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="usage-empty">
                      No AI features used in this period.
                    </p>
                  )}
                </section>
              </div>
              <div className="usage-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <h3>Activity totals</h3>
                  </div>
                  {data.activities.length ? (
                    <ul className="usage-list">
                      {data.activities.map((row) => (
                        <li key={row._id}>
                          <button
                            className="text-link"
                            onClick={() => {
                              changePane("activity");
                              setFilter(row._id);
                            }}
                          >
                            {activityLabels[row._id] || row._id}
                          </button>
                          <strong>{number(row.count)}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="usage-empty">
                      No recorded activity in this period.
                    </p>
                  )}
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <h3>Current assessment status</h3>
                  </div>
                  <ul className="usage-list">
                    {[
                      ["queued", "Queued"],
                      ["processing", "Generating"],
                      ["done", "Ready"],
                      ["error", "Failed"],
                    ].map(([key, label]) => (
                      <li key={key}>
                        <span>{label}</span>
                        <strong>
                          {number(
                            data.queue.find((row) => row._id === key)?.count,
                          )}
                        </strong>
                      </li>
                    ))}
                  </ul>
                  <p className="usage-empty">
                    Current totals for this scope, independent of the selected
                    period.
                  </p>
                </section>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <h3>API performance</h3>
                  <span className="field-hint">Up to 30 days</span>
                </div>
                <div className="usage-health-metrics">
                  <div>
                    <span>Error rate</span>
                    <strong>
                      {api.requests
                        ? `${((api.errors / api.requests) * 100).toFixed(1)}%`
                        : "—"}
                    </strong>
                  </div>
                  <div>
                    <span>Server errors</span>
                    <strong>{number(api.serverErrors)}</strong>
                  </div>
                  <div>
                    <span>Rate limited</span>
                    <strong>{number(api.rateLimited)}</strong>
                  </div>
                  <div>
                    <span>Slowest request</span>
                    <strong>{duration(api.maxMs)}</strong>
                  </div>
                </div>
                {data.api.routes.length > 0 && (
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Endpoint</th>
                          <th>Requests</th>
                          <th>Errors</th>
                          <th>Average</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.api.routes.map((row) => (
                          <tr key={`${row._id.method}${row._id.route}`}>
                            <td>
                              <code>
                                {row._id.method} {row._id.route}
                              </code>
                            </td>
                            <td data-label="Requests">
                              {number(row.requests)}
                            </td>
                            <td data-label="Errors">{number(row.errors)}</td>
                            <td data-label="Average">
                              {duration(row.averageMs)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
              {data.runtime && (
                <section className="panel">
                  <div className="panel-heading">
                    <h3>Server & worker</h3>
                    <span className="field-hint">Current API process</span>
                  </div>
                  <dl className="usage-runtime">
                    <div>
                      <dt>API uptime</dt>
                      <dd>
                        {Math.floor(data.runtime.uptimeSeconds / 3600)}h{" "}
                        {Math.floor(data.runtime.uptimeSeconds / 60) % 60}m
                      </dd>
                    </div>
                    <div>
                      <dt>Memory in use</dt>
                      <dd>{Math.round(data.runtime.rssBytes / 1048576)} MB</dd>
                    </div>
                    <div>
                      <dt>JavaScript heap</dt>
                      <dd>
                        {Math.round(data.runtime.heapUsedBytes / 1048576)} /{" "}
                        {Math.round(data.runtime.heapTotalBytes / 1048576)} MB
                      </dd>
                    </div>
                    <div>
                      <dt>Node.js</dt>
                      <dd>{data.runtime.nodeVersion}</dd>
                    </div>
                    <div>
                      <dt>MongoDB</dt>
                      <dd>
                        {data.runtime.databaseConnected
                          ? "Connected"
                          : "Disconnected"}
                      </dd>
                    </div>
                    <div>
                      <dt>Monitoring write failures since restart</dt>
                      <dd>{number(data.runtime.writeFailures)}</dd>
                    </div>
                    <div>
                      <dt>Last reported worker state</dt>
                      <dd>{data.runtime.worker?.status || "No report"}</dd>
                    </div>
                    <div>
                      <dt>Last worker poll</dt>
                      <dd>{timestamp(data.runtime.worker?.lastPollAt)}</dd>
                    </div>
                    <div>
                      <dt>Last generation completed</dt>
                      <dd>{timestamp(data.runtime.worker?.lastCompletedAt)}</dd>
                    </div>
                  </dl>
                </section>
              )}
            </>
          )}
        </>
      )}
      {pane === "users" && (
        <section className="panel">
          <div className="library-toolbar">
            <form
              className="usage-search"
              onSubmit={(event) => {
                event.preventDefault();
                setQuery(input.trim());
                setPage(1);
              }}
            >
              <label className="search-field">
                <FiSearch />
                <input
                  aria-label="Search people"
                  placeholder="Name or email"
                  value={input}
                  maxLength={100}
                  onChange={(event) => setInput(event.target.value)}
                />
              </label>
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>
            <select
              className="select-control"
              aria-label="Sort people"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
            >
              <option value="tokens">Most tokens</option>
              <option value="requests">Most API requests</option>
              <option value="activity">Recent activity</option>
            </select>
            <Button
              variant="secondary"
              icon={FiDownload}
              disabled={!people.data?.rows.length}
              onClick={() => downloadUsage(people.data.rows)}
            >
              Export page
            </Button>
          </div>
          {teamId && (
            <p className="usage-coverage">
              Current members. Team totals and history also include past
              members’ team activity.
            </p>
          )}
          <ErrorNotice message={people.error} onRetry={people.reload} />
          {people.loading ? (
            <LoadingState />
          ) : people.data?.rows.length ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Tokens / AI calls</th>
                    <th>API requests</th>
                    <th>Attempts</th>
                    <th>Last activity</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {people.data.rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong className="table-title">{row.name}</strong>
                        <small className="table-subtitle">{row.email}</small>
                      </td>
                      <td data-label="Tokens / AI calls">
                        <strong>{tokenTotal(row.ai)}</strong>
                        <small className="table-subtitle">
                          {number(row.ai.calls)} calls · {number(row.ai.failed)}{" "}
                          failed
                        </small>
                      </td>
                      <td data-label="API requests">
                        {number(row.api.requests)}
                        <small className="table-subtitle">
                          {number(row.api.errors)} errors
                        </small>
                      </td>
                      <td data-label="Attempts">
                        {number(row.activity.started)} started
                        <small className="table-subtitle">
                          {number(row.activity.completed)} completed
                        </small>
                      </td>
                      <td data-label="Last activity">
                        {timestamp(row.activity.lastAt)}
                      </td>
                      <td data-label="Details">
                        <button
                          className="text-link"
                          onClick={() => focusUser(row)}
                        >
                          View activity
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !people.error && (
              <EmptyState
                title="No matching people"
                description="Try another name or email."
              />
            )
          )}
          <Pager data={people.data} page={page} setPage={setPage} />
        </section>
      )}
      {["activity", "ai", "api"].includes(pane) && (
        <section className="panel">
          <div className="library-toolbar">
            <h3>
              {panes.find(([key]) => key === pane)[1]}
              {selected ? ` · ${selected.name}` : ""}
            </h3>
            <select
              className="select-control"
              aria-label="Filter events"
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">
                All {pane === "activity" ? "activities" : "statuses"}
              </option>
              {pane === "activity" ? (
                Object.entries(activityLabels)
                  .filter(
                    ([key]) =>
                      !teamId ||
                      !["auth.", "profile.", "password.", "platform."].some(
                        (prefix) => key.startsWith(prefix),
                      ),
                  )
                  .map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))
              ) : pane === "ai" ? (
                <>
                  <option value="success">Successful</option>
                  <option value="failed">Failed</option>
                  <option value="in_progress">Unfinished</option>
                </>
              ) : (
                <option value="errors">Errors only</option>
              )}
            </select>
          </div>
          <ErrorNotice message={events.error} onRetry={events.reload} />
          {rows.loading ? (
            <LoadingState />
          ) : rows.data?.rows.length ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{pane === "activity" ? "Activity" : "Request"}</th>
                    <th>Person</th>
                    <th>{pane === "activity" ? "Context" : "Status"}</th>
                    <th>
                      {pane === "ai"
                        ? "Usage & duration"
                        : pane === "api"
                          ? "Duration"
                          : "Source"}
                    </th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.data.rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong className="table-title">
                          {pane === "activity"
                            ? activityLabels[row.action] || row.action
                            : pane === "ai"
                              ? row.operation === "questions"
                                ? "Question generation"
                                : row.operation === 'planning' ? 'Assessment planning' : row.operation === 'engine_build' ? 'Engine building' : "Answer explanation"
                              : `${row.method} ${row.route}`}
                        </strong>
                        {pane === "ai" && (
                          <small className="table-subtitle">{row.model}{row.agent ? ` · ${row.agent.replaceAll('-', ' ')}` : ''}</small>
                        )}
                        {row.testName && (
                          <small className="table-subtitle">
                            {row.testName}
                          </small>
                        )}
                      </td>
                      <td data-label="Person">
                        {row.user ? (
                          <button
                            className="text-link"
                            onClick={() => focusUser(row.user)}
                          >
                            {row.user.name}
                          </button>
                        ) : (
                          "Unauthenticated / unavailable"
                        )}
                      </td>
                      <td
                        data-label={pane === "activity" ? "Context" : "Status"}
                      >
                        {pane === "activity" ? (
                          [row.targetUser?.name, row.role]
                            .filter(Boolean)
                            .join(" · ") || "—"
                        ) : (
                          <span
                            className={`soft-tag ${row.status === "failed" || row.status >= 400 ? "text-danger" : ""}`}
                          >
                            {row.status === "in_progress"
                              ? "Unfinished"
                              : row.status}
                          </span>
                        )}
                        {row.errorCode && (
                          <small className="table-subtitle">
                            {row.errorCode}
                          </small>
                        )}
                      </td>
                      <td
                        data-label={
                          pane === "ai"
                            ? "Usage & duration"
                            : pane === "api"
                              ? "Duration"
                              : "Source"
                        }
                      >
                        {pane === "ai" ? (
                          <>
                            <strong>
                              {row.totalTokens == null
                                ? "Unreported tokens"
                                : `${number(row.totalTokens)} tokens`}
                            </strong>
                            <small className="table-subtitle">
                              Input {row.promptTokens ?? "—"} · Output{" "}
                              {row.outputTokens ?? "—"} · Thinking{" "}
                              {row.thinkingTokens ?? "—"}
                            </small>
                            <small className="table-subtitle">
                              {duration(row.durationMs)}
                            </small>
                          </>
                        ) : pane === "api" ? (
                          duration(row.durationMs)
                        ) : row.source === "system" ? (
                          "Automatic"
                        ) : (
                          "User"
                        )}
                      </td>
                      <td data-label="Time">
                        {timestamp(row.startedAt || row.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !rows.error && (
              <EmptyState
                title="No events in this period"
                description="New activity will appear as people use the app."
              />
            )
          )}
          <Pager data={rows.data} page={page} setPage={setPage} />
        </section>
      )}
    </div>
  );
}
