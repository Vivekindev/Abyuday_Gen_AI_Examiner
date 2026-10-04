import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  FiArrowUpRight,
  FiBookOpen,
  FiChevronLeft,
  FiChevronRight,
  FiCopy,
  FiFileText,
  FiGrid,
  FiList,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";
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
import RetryAssessmentButton from '../../components/RetryAssessmentButton';
import { api, copyText, errorMessage, formatDate } from "../../lib/api";

const matchesStatus = (test, status) =>
  status === "all" ||
  (status === "ready" && test.status === "Done") ||
  (status === "progress" &&
    ["queued", "Queued", "Processing"].includes(test.status)) ||
  (status === "failed" && test.status === "Error");
export default function AssessmentLibrary() {
  const resource = useResource("/fetchcreatedtests", {
    method: "post",
    interval: 10000,
  });
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const query = params.get("q") || "";
  const status = params.get("status") || "all";
  const audience = params.get("audience") || "";
  const view = params.get("view") === "grid" ? "grid" : "list";
  const change = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    next.delete("created");
    setParams(next, { replace: true });
    setPage(1);
  };
  const tests = resource.data || [];
  const filtered = tests.filter(
    (test) =>
      matchesStatus(test, status) &&
      (!audience || test.teamName === audience) &&
      `${test.testName} ${test.testID} ${test.testModel}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 8, currentPage * 8);
  const copy = async (test) => {
    try {
      await copyText(
        `${window.location.origin}/dashboard/take?testID=${test.testID}`,
      );
      toast.success("Assessment link copied");
    } catch (error) {
      toast.error(error.message);
    }
  };
  const actions = (test) => (
    <div className="table-actions">
      {test.status === 'Error' && test.canRetry && <RetryAssessmentButton testID={test.testID} name={test.testName} onRetried={resource.reload} />}
      <button
        className="icon-button"
        onClick={() => copy(test)}
        aria-label={`Copy link for ${test.testName}`}
        title="Copy link"
      >
        <FiCopy />
      </button>
      <Link
        className="icon-button"
        to={`/dashboard/take?testID=${test.testID}`}
        aria-label={`Open ${test.testName}`}
        title="Open assessment"
      >
        <FiArrowUpRight />
      </Link>
      {test.canManage && <button className="icon-button text-danger" onClick={() => { setDeleteError(""); setDeleteTarget(test); }} aria-label={`Delete ${test.testName}`} title="Delete assessment"><FiTrash2 /></button>}
    </div>
  );
  return (
    <div className="route-transition">
      <PageHeading title="Assessments">
        <Button to="/dashboard/create" icon={FiPlus}>
          Create assessment
        </Button>
      </PageHeading>
      <p className="section-description library-management-note">Manage assessments you created and assessments shared with teams you administer. Deleting removes their attempts and results.</p>
      {params.get("created") && (
        <div className="notice notice-success" role="status">
          <FiCheckQueued />
          <span>Assessment created. Its current status is shown below.</span>
        </div>
      )}
      <nav className="tabs" aria-label="Filter assessments">
        {[
          ["all", "All"],
          ["ready", "Ready"],
          ["progress", "In progress"],
          ["failed", "Failed"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={status === id ? "active" : ""}
            onClick={() => change("status", id)}
            aria-pressed={status === id}
          >
            {label}
            <span className="tab-count">
              {tests.filter((test) => matchesStatus(test, id)).length}
            </span>
          </button>
        ))}
      </nav>
      <ErrorNotice message={resource.error} onRetry={resource.reload} />
      <section className="panel">
        <div className="library-toolbar">
          <label className="search-field">
            <FiSearch />
            <input
              aria-label="Search assessments"
              placeholder="Search by name, ID, or model…"
              value={query}
              onChange={(event) => change("q", event.target.value)}
            />
          </label>
          <div className="library-controls">
            <select
              className="select-control"
              aria-label="Filter audience"
              value={audience}
              onChange={(event) => change("audience", event.target.value)}
            >
              <option value="">All audiences</option>
              {[...new Set(tests.map((test) => test.teamName))].map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
            <div className="view-toggle" aria-label="View style">
              <button
                className={view === "list" ? "active" : ""}
                onClick={() => change("view", "list")}
                aria-label="List view"
                aria-pressed={view === "list"}
              >
                <FiList />
              </button>
              <button
                className={view === "grid" ? "active" : ""}
                onClick={() => change("view", "grid")}
                aria-label="Grid view"
                aria-pressed={view === "grid"}
              >
                <FiGrid />
              </button>
            </div>
            <button
              className="icon-button"
              onClick={resource.reload}
              aria-label="Refresh assessments"
            >
              <FiRefreshCw />
            </button>
          </div>
        </div>
        {resource.loading ? (
          <LoadingState rows={5} />
        ) : visible.length ? (
          view === "grid" ? (
            <div className="card-grid">
              {visible.map((test) => (
                <article className="assessment-card" key={test.testID}>
                  <div className="assessment-card-top">
                    <span className="assessment-glyph">
                      <FiFileText />
                    </span>
                    <Status value={test.status} />
                  </div>
                  <h3>
                    <Link to={`/dashboard/take?testID=${test.testID}`}>
                      {test.testName}
                    </Link>
                  </h3>
                  <div className="assessment-card-meta">
                    <span>{test.questionCount} questions</span>
                    <span>{test.difficulty}</span>
                  </div>
                  <p>{formatDate(test.createdAt)}</p>
                  <div className="assessment-card-footer">
                    <span className="soft-tag">{test.teamName}</span>
                    {actions(test)}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Assessment name</th>
                    <th>Audience</th>
                    <th>Questions</th>
                    <th>Difficulty</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((test) => (
                    <tr key={test.testID}>
                      <td>
                        <div className="table-person">
                          <span className="assessment-glyph">
                            <FiFileText />
                          </span>
                          <div>
                            <Link
                              className="table-title"
                              to={`/dashboard/take?testID=${test.testID}`}
                            >
                              {test.testName}
                            </Link>
                            <span className="table-subtitle">
                              {formatDate(test.createdAt)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td data-label="Audience">
                        <span className="soft-tag">{test.teamName}</span>
                      </td>
                      <td data-label="Questions">{test.questionCount}</td>
                      <td data-label="Difficulty">{test.difficulty}</td>
                      <td data-label="Status">
                        <Status value={test.status} />
                        {test.assessmentMode === 'interactive' && <span className="table-subtitle">{test.status === 'Processing' ? (test.generationStage || 'Preparing tasks').replaceAll('-', ' ') : 'Interactive'}</span>}
                      </td>
                      <td data-label="Actions">{actions(test)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          !resource.error && (
            <EmptyState
              icon={FiBookOpen}
              title={
                tests.length ? "No matching assessments" : "No assessments yet"
              }
              description={
                tests.length
                  ? "Try another search or clear your filters."
                  : "Create an assessment to get started."
              }
            >
              {tests.length ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setParams({});
                    setPage(1);
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button to="/dashboard/create" icon={FiPlus}>
                  Create assessment
                </Button>
              )}
            </EmptyState>
          )
        )}
        <div className="table-footer">
          <span>
            {filtered.length
              ? `${(currentPage - 1) * 8 + 1}–${Math.min(currentPage * 8, filtered.length)} of ${filtered.length} assessments`
              : "No assessments"}
            {tests.length >= 200 && (
              <span className="library-intro">
                Showing the latest 200 assessments
              </span>
            )}
          </span>
          <div className="pagination">
            <button
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <FiChevronLeft />
            </button>
            <span>
              Page {currentPage} of {pages}
            </span>
            <button
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage === pages}
              aria-label="Next page"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </section>
      <Modal open={!!deleteTarget} onClose={() => { if (!deleting) setDeleteTarget(null); }} title="Delete assessment?">
        <p className="section-description">{deleteTarget?.testName} and all saved attempts and results will be permanently deleted.</p>
        <ErrorNotice message={deleteError} />
        <div className="form-actions"><Button variant="secondary" disabled={deleting} onClick={() => setDeleteTarget(null)}>Cancel</Button><Button className="btn-danger" disabled={deleting} onClick={async () => { setDeleting(true); setDeleteError(""); try { await api.delete(`/test/${encodeURIComponent(deleteTarget.testID)}`); toast.success("Assessment deleted"); setDeleteTarget(null); resource.reload(); } catch (error) { setDeleteError(errorMessage(error)); } finally { setDeleting(false); } }}>{deleting ? "Deleting…" : "Delete assessment"}</Button></div>
      </Modal>
    </div>
  );
}
function FiCheckQueued() {
  return <FiRefreshCw />;
}
