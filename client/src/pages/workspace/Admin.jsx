import { useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { FiRefreshCw, FiSearch, FiShield, FiUserPlus } from "react-icons/fi";
import { toast } from "sonner";
import {
  Button,
  EmptyState,
  ErrorNotice,
  LoadingState,
  Modal,
  PageHeading,
  Status,
} from "../../components/ui";
import useResource from "../../hooks/useResource";
import { api, errorMessage, formatDate } from "../../lib/api";
import "./admin.css";
import UsageMonitor from "../../components/UsageMonitor";

const sections = [
  ["overview", "Overview"],
  ["users", "Users"],
  ["assessments", "Assessments"],
  ["teams", "Teams"],
  ["results", "Results"],
  ["monitoring", "Usage & monitoring"],
  ["members", "Admin access"],
];
const columns = {
  users: [
    ["name", "Name"],
    ["email", "Email"],
    ["createdAt", "Joined"],
  ],
  assessments: [
    ["name", "Assessment"],
    ["status", "Status"],
    ["creator", "Created by"],
    ["team", "Team"],
    ["createdAt", "Created"],
    ["details", "Details"],
  ],
  teams: [
    ["name", "Team"],
    ["members", "Members"],
    ["createdAt", "Created"],
    ["details", "Details"],
  ],
  results: [
    ["name", "Assessment"],
    ["participant", "Participant"],
    ["score", "Score"],
    ["finishedAt", "Completed"],
  ],
};

export default function Admin() {
  const { me } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const allowed = ["owner", "admin"].includes(me?.platformRole);
  const tab = sections.some(([key]) => key === params.get("tab"))
    ? params.get("tab")
    : "overview";
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState(null);
  const [email, setEmail] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);
  const resource = useResource(
    allowed && tab !== "monitoring"
      ? `/admin/${tab}?${new URLSearchParams({ q: search, page: String(page), status })}`
      : null,
  );
  const data = resource.data;
  const changeTab = (next) => {
    setParams({ tab: next });
    setPage(1);
    setQuery("");
    setSearch("");
    setStatus("");
    setError("");
  };
  const manageAccess = async () => {
    if (!confirm || busy) return;
    setBusy(true);
    setError("");
    try {
      if (confirm.action === "grant")
        await api.post("/admin/members", { email: confirm.email });
      else await api.delete(`/admin/members/${confirm.id}`);
      toast.success(
        confirm.action === "grant"
          ? "Admin access granted"
          : "Admin access removed",
      );
      setConfirm(null);
      setEmail("");
      resource.reload();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };
  const renderCell = (row, key) => {
    if (key === "name")
      return (
        <>
          <strong className="table-title">{row.name}</strong>
          {row.testID && <span className="table-subtitle">{row.testID}</span>}
        </>
      );
    if (key === "status") return <Status value={row.status} />;
    if (key === "createdAt" || key === "finishedAt")
      return formatDate(row[key]);
    if (key === "creator" || key === "participant")
      return (
        <>
          <strong className="table-title">
            {row[key]?.name || "Deleted account"}
          </strong>
          <span className="table-subtitle">{row[key]?.email}</span>
        </>
      );
    if (key === "members") return row.members.length;
    if (key === "score")
      return (
        <span>
          {row.total > 0
            ? `${Math.round((row.score / row.total) * 100)}%`
            : "—"}{" "}
          <small className="muted">
            ({row.score}/{row.total})
          </small>
        </span>
      );
    if (key === "details")
      return (
        <button className="text-link" onClick={() => setDetail(row)}>
          View details
        </button>
      );
    return row[key] || "—";
  };
  if (!me) return <LoadingState rows={4} />;
  if (!allowed)
    return (
      <section className="panel">
        <EmptyState
          icon={FiShield}
          title="Admin access required"
          description="Ask the platform owner to grant access to your account."
        />
      </section>
    );
  return (
    <div className="admin-page">
      <PageHeading
        title="Admin"
        description="Platform data and access management."
      >
        <Button
          variant="secondary"
          icon={FiRefreshCw}
          onClick={resource.reload}
          disabled={resource.loading}
        >
          Refresh
        </Button>
      </PageHeading>
      <nav className="tabs" aria-label="Admin sections">
        {sections.map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            aria-pressed={tab === key}
            onClick={() => changeTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      <ErrorNotice message={resource.error} onRetry={resource.reload} />
      {tab === "monitoring" && <UsageMonitor />}
      {columns[tab] && (
        <section className="panel">
          <div className="library-toolbar">
            <label className="search-field">
              <FiSearch />
              <input
                type="search"
                aria-label={`Search ${tab}`}
                placeholder={`Search ${tab}`}
                value={query}
                maxLength={100}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            {tab === "assessments" && (
              <select
                className="select-control"
                aria-label="Assessment status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                <option value="Done">Ready</option>
                <option value="Queued">Queued</option>
                <option value="Processing">Generating</option>
                <option value="Error">Failed</option>
              </select>
            )}
          </div>
          {resource.loading ? (
            <LoadingState rows={4} />
          ) : data?.rows?.length ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    {columns[tab].map(([key, label]) => (
                      <th key={key}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.id}>
                      {columns[tab].map(([key, label]) => (
                        <td key={key} data-label={label}>
                          {renderCell(row, key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !resource.error && (
              <EmptyState
                title="No records found"
                description={
                  search || status
                    ? "Try a different search or filter."
                    : "Records will appear here as people use the app."
                }
              />
            )
          )}
          {data && (
            <div className="table-footer">
              <span>{data.total.toLocaleString()} records</span>
              <div className="pagination">
                <Button
                  variant="secondary"
                  disabled={page <= 1 || resource.loading}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span>
                  {page} / {data.pages}
                </span>
                <Button
                  variant="secondary"
                  disabled={page >= data.pages || resource.loading}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </section>
      )}
      {!columns[tab] && resource.loading ? (
        <LoadingState rows={4} />
      ) : tab === "overview" && data ? (
        <>
          <div className="stats-grid">
            {[
              ["users", "Users"],
              ["teams", "Teams"],
              ["assessments", "Assessments"],
              ["completed", "Completed attempts"],
            ].map(([key, label]) => (
              <article key={key} className="stat-card">
                <span className="stat-top">{label}</span>
                <strong className="stat-value">
                  {data[key].toLocaleString()}
                </strong>
              </article>
            ))}
          </div>
          <div className="overview-panels">
            <section className="panel">
              <div className="panel-heading">
                <h2>Assessment generation</h2>
              </div>
              <dl className="admin-metrics">
                {[
                  ["ready", "Ready", "Done"],
                  ["queued", "Queued", "Queued"],
                  ["generating", "Generating", "Processing"],
                  ["failed", "Failed", "Error"],
                ].map(([key, label, filter]) => (
                  <div key={key}>
                    <dt>
                      <button
                        className="text-link"
                        onClick={() => {
                          changeTab("assessments");
                          setStatus(filter);
                        }}
                      >
                        {label}
                      </button>
                    </dt>
                    <dd>{data[key].toLocaleString()}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="panel panel-padding">
              <h2>Active attempts</h2>
              <strong className="stat-value">
                {data.active.toLocaleString()}
              </strong>
              <p className="field-hint">
                Started assessments with time remaining.
              </p>
              <Button variant="secondary" onClick={() => changeTab("results")}>
                View completed results
              </Button>
            </section>
          </div>
        </>
      ) : null}
      {tab === "members" && data && (
        <div className="admin-access">
          <section className="panel panel-padding">
            <h2>Platform admins</h2>
            <p className="section-description">
              Admins can view users, teams, assessments, and results across the
              app. Only the platform owner can grant or remove this access.
            </p>
            {me.platformRole === "owner" && (
              <form
                className="admin-add"
                onSubmit={(event) => {
                  event.preventDefault();
                  setError("");
                  setConfirm({ action: "grant", email: email.trim() });
                }}
              >
                <label className="field">
                  Existing account email
                  <input
                    type="email"
                    required
                    maxLength={254}
                    placeholder="name@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <Button type="submit" icon={FiUserPlus}>
                  Add admin
                </Button>
              </form>
            )}
            <ul className="admin-members">
              {data.owner && (
                <li>
                  <div>
                    <strong>{data.owner.name}</strong>
                    <small>{data.owner.email}</small>
                  </div>
                  <span className="soft-tag">Owner</span>
                </li>
              )}
              {data.admins.map((admin) => (
                <li key={admin.id}>
                  <div>
                    <strong>{admin.name}</strong>
                    <small>{admin.email}</small>
                  </div>
                  <span className="soft-tag">Admin</span>
                  {me.platformRole === "owner" && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setError("");
                        setConfirm({ ...admin, action: "revoke" });
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h2>Access history</h2>
              <span className="field-hint">Latest 20 changes</span>
            </div>
            {data.audit.length ? (
              <ul className="admin-audit">
                {data.audit.map((item) => (
                  <li key={item.id}>
                    <p>
                      <strong>{item.actor?.name || "Deleted account"}</strong>{" "}
                      {item.action} access{" "}
                      {item.action === "granted" ? "to" : "for"}{" "}
                      <strong>{item.target?.email || "Deleted account"}</strong>
                    </p>
                    <small>{formatDate(item.createdAt)}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No access changes"
                description="Adding or removing an admin creates a record here."
              />
            )}
          </section>
        </div>
      )}
      <Modal
        open={!!confirm}
        onClose={() => {
          if (!busy) setConfirm(null);
        }}
        title={
          confirm?.action === "grant"
            ? "Grant admin access?"
            : "Remove admin access?"
        }
      >
        <p className="section-description">
          {confirm?.action === "grant"
            ? `${confirm.email} will be able to view data across the entire app.`
            : `${confirm?.email} will lose platform admin access. Their account and team permissions will remain available.`}
        </p>
        <ErrorNotice message={error} />
        <div className="form-actions">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => setConfirm(null)}
          >
            Cancel
          </Button>
          <Button disabled={busy} onClick={manageAccess}>
            {busy
              ? "Saving…"
              : confirm?.action === "grant"
                ? "Grant access"
                : "Remove access"}
          </Button>
        </div>
      </Modal>
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.name || "Details"}
      >
        {detail?.members ? (
          <ul className="admin-members">
            {detail.members.map((member, index) => (
              <li key={member.id || index}>
                <div>
                  <strong>{member.name || "Deleted account"}</strong>
                  <small>{member.email}</small>
                </div>
                <span className="soft-tag">{member.role}</span>
              </li>
            ))}
          </ul>
        ) : (
          detail && (
            <dl className="admin-details">
              <dt>Assessment ID</dt>
              <dd>{detail.testID}</dd>
              <dt>Topic</dt>
              <dd>{detail.prompt}</dd>
              <dt>Questions</dt>
              <dd>{detail.questions}</dd>
              <dt>Difficulty</dt>
              <dd>{detail.difficulty}/10</dd>
              <dt>Model</dt>
              <dd>{detail.model}</dd>
            </dl>
          )
        )}
      </Modal>
    </div>
  );
}
