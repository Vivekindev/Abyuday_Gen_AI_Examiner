import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiArrowRight, FiDownload, FiSearch } from "react-icons/fi";
import {
  Button,
  EmptyState,
  ErrorNotice,
  LoadingState,
  PageHeading,
  Status,
} from "../../components/ui";
import { ScoreTrend, AnswerBreakdown } from "../../components/ui/ResultCharts";
import useResource from "../../hooks/useResource";
import { formatDate } from "../../lib/api";
import {
  normalizeAttempts,
  summarizeResults,
  rankScores,
  withinPeriod,
  percentageLabel,
} from "../../lib/results";
import "./results.css";

export default function Results() {
  const [params, setParams] = useSearchParams();
  const teams = useResource("/teams");
  const manageable = (teams.data || []).filter((team) =>
    ["owner", "admin"].includes(team.role),
  );
  const selectedTeam = manageable.find(
    (team) => team.id === params.get("team"),
  );
  const resource = useResource(
    params.get("team") && teams.loading
      ? null
      : selectedTeam
        ? `/teams/${selectedTeam.id}/results`
        : "/me/attempts",
    { interval: 30000 },
  );
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const tab = ["analytics", "scoreboard"].includes(params.get("tab"))
    ? params.get("tab")
    : "history";
  const period = ["7", "30", "90"].includes(params.get("period"))
    ? params.get("period")
    : "all";
  const normalized = normalizeAttempts(resource.data || [], !!selectedTeam);
  const attempts = normalized.filter((row) => withinPeriod(row, period));
  const summary = summarizeResults(attempts);
  const rankTests = [
    ...new Map(
      summary.completed.map((row) => [row.testID, row.testName]),
    ).entries(),
  ];
  const rankTestId = rankTests.some(([id]) => id === params.get("test"))
    ? params.get("test")
    : rankTests[0]?.[0];
  const ranking = rankScores(
    selectedTeam
      ? attempts.filter((row) => row.testID === rankTestId)
      : attempts,
  );
  const filtered = (tab === "scoreboard" ? ranking : attempts).filter((row) =>
    `${row.testName} ${row.name || ""} ${row.email || ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  const change = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key === "team") next.delete("test");
    setParams(next);
    setPage(1);
    setQuery("");
  };
  const exportResults = () => {
    const escape = (value) =>
      `"${String(value ?? "")
        .replace(/^[=+@-]/, "'$&")
        .replaceAll('"', '""')}"`;
    const rows = [
      [
        "Assessment",
        "Participant",
        "Correct",
        "Questions",
        "Score %",
        "Completed",
      ],
      ...summary.completed.map((row) => [
        row.testName,
        row.name || "Me",
        row.score,
        row.total,
        Math.round(row.percentage),
        formatDate(row.date),
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((row) => row.map(escape).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = selectedTeam ? "team-results.csv" : "my-results.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const loading = resource.loading || (params.has("team") && teams.loading);
  return (
    <div>
      <PageHeading title="Results">
        <Button
          variant="secondary"
          icon={FiDownload}
          onClick={exportResults}
          disabled={!summary.completed.length}
        >
          Export CSV
        </Button>
      </PageHeading>
      <div className="results-filters">
        <label>
          View
          <select
            className="select-control"
            value={selectedTeam?.id || ""}
            onChange={(event) => change("team", event.target.value)}
            disabled={teams.loading}
          >
            <option value="">My results</option>
            {manageable.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Period
          <select
            className="select-control"
            value={period}
            onChange={(event) => change("period", event.target.value)}
          >
            <option value="all">All available</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>
        <span className="results-scope-note">
          Based on up to 100 recent attempts
        </span>
      </div>
      <ErrorNotice
        message={teams.error || resource.error}
        onRetry={teams.error ? teams.reload : resource.reload}
      />
      <div className="stats-grid">
        {[
          ["Completed", summary.completed.length, "Finished attempts"],
          [
            "Average score",
            percentageLabel(summary.average),
            "Each attempt has equal weight",
          ],
          [
            "Best score",
            percentageLabel(summary.best),
            "Highest completed score",
          ],
          [
            "Answer accuracy",
            percentageLabel(summary.accuracy),
            `${summary.correct} of ${summary.total} questions correct`,
          ],
        ].map(([label, value, note]) => (
          <article className="stat-card" key={label}>
            <span className="stat-top">{label}</span>
            <strong className="stat-value">{loading ? "—" : value}</strong>
            <span className="stat-note">{note}</span>
          </article>
        ))}
      </div>
      <nav className="tabs" aria-label="Results sections">
        {[
          ["history", "History"],
          ["analytics", "Analytics"],
          ["scoreboard", "Scoreboard"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={tab === value ? "active" : ""}
            aria-pressed={tab === value}
            onClick={() => change("tab", value)}
          >
            {label}
          </button>
        ))}
      </nav>
      {loading ? (
        <section className="panel">
          <LoadingState rows={4} />
        </section>
      ) : tab === "analytics" ? (
        summary.completed.length ? (
          <div className="analytics-grid">
            <ScoreTrend rows={summary.completed} />
            <AnswerBreakdown summary={summary} />
            <section className="panel distribution-panel">
              <div className="panel-heading">
                <h2>Score distribution</h2>
                <span className="field-hint">Completed attempts</span>
              </div>
              <div className="histogram">
                {[
                  [0, 25, "0–24%"],
                  [25, 50, "25–49%"],
                  [50, 75, "50–74%"],
                  [75, 101, "75–100%"],
                ].map(([min, max, label]) => {
                  const count = summary.completed.filter(
                    (row) => row.percentage >= min && row.percentage < max,
                  ).length;
                  return (
                    <div key={label}>
                      <span>{label}</span>
                      <div className="histogram-track">
                        <i
                          style={{
                            width: `${(count / summary.completed.length) * 100}%`,
                          }}
                        />
                      </div>
                      <strong>{count}</strong>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        ) : (
          <section className="panel">
            <EmptyState
              title="No completed results"
              description="Complete an assessment or choose a different period to view analytics."
            />
          </section>
        )
      ) : (
        <section className="panel">
          <div className="library-toolbar">
            <div>
              <h2 className="results-table-title">
                {tab === "scoreboard"
                  ? selectedTeam
                    ? "Team rankings"
                    : "Your highest scores"
                  : "Attempt history"}
              </h2>
              {tab === "scoreboard" && (
                <p className="field-hint">
                  {selectedTeam
                    ? "Compare members on the same assessment. Equal scores share a rank."
                    : "Your assessments ranked by score."}
                </p>
              )}
            </div>
            <label className="search-field">
              <FiSearch />
              <input
                aria-label="Search results"
                placeholder={
                  selectedTeam
                    ? "Search assessment or person"
                    : "Search assessments"
                }
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </label>
          </div>
          {tab === "scoreboard" && selectedTeam && rankTests.length > 0 && (
            <div className="scoreboard-filter">
              <label className="field">
                Assessment
                <select
                  value={rankTestId}
                  onChange={(event) => change("test", event.target.value)}
                >
                  {rankTests.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {visible.length ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      {selectedTeam && tab === "scoreboard"
                        ? "Participant"
                        : "Assessment"}
                    </th>
                    {tab === "scoreboard" ? <th>Rank</th> : <th>Status</th>}
                    <th>Score</th>
                    <th>Completed</th>
                    {!(selectedTeam && tab === "scoreboard") && (
                      <th>{selectedTeam ? "Participant" : "Action"}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong className="table-title">
                          {selectedTeam && tab === "scoreboard"
                            ? row.name
                            : row.testName}
                        </strong>
                        {selectedTeam && tab === "scoreboard" && (
                          <span className="table-subtitle">
                            {row.email || row.testName}
                          </span>
                        )}
                      </td>
                      <td data-label={tab === "scoreboard" ? "Rank" : "Status"}>
                        {tab === "scoreboard" ? (
                          <span className="rank-number">#{row.rank}</span>
                        ) : row.isEnded ? (
                          <Status value="Completed" />
                        ) : (
                          <span className="soft-tag">
                            {row.expired ? "Time ended" : "In progress"}
                          </span>
                        )}
                      </td>
                      <td data-label="Score">
                        <div className="result-score">
                          <strong>{percentageLabel(row.percentage)}</strong>
                          {row.isEnded && (
                            <small>
                              {row.score}/{row.total}
                            </small>
                          )}
                        </div>
                      </td>
                      <td data-label="Completed">
                        {row.isEnded ? formatDate(row.date) : "—"}
                      </td>
                      {!(selectedTeam && tab === "scoreboard") && (
                        <td
                          data-label={selectedTeam ? "Participant" : "Action"}
                        >
                          {selectedTeam ? (
                            row.name
                          ) : (
                            <Link
                              className="text-link"
                              to={`/test?testID=${row.testID}`}
                            >
                              {row.isEnded || row.expired ? "Review" : "Resume"}
                              <FiArrowRight />
                            </Link>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title={
                query ? "No matching results" : "No results in this period"
              }
              description="Results appear after an assessment is started or completed."
            />
          )}
          <div className="table-footer">
            <span>
              {filtered.length} {filtered.length === 1 ? "result" : "results"}
            </span>
            <div className="pagination">
              <Button
                variant="secondary"
                className="btn-sm"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </Button>
              <span>
                {currentPage} / {pages}
              </span>
              <Button
                variant="secondary"
                className="btn-sm"
                disabled={currentPage === pages}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
