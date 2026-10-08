import { Link, Navigate, useSearchParams } from "react-router-dom";
import {
  FiArrowRight,
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiPlus,
  FiTarget,
} from "react-icons/fi";
import {
  Button,
  EmptyState,
  ErrorNotice,
  LoadingState,
  PageHeading,
  SectionLink,
  Status,
} from "../../components/ui";
import useResource from "../../hooks/useResource";
import { formatDate } from "../../lib/api";

export default function Overview() {
  const [params] = useSearchParams();
  const overview = useResource("/dashboard/overview", { interval: 15000 });
  const tests = useResource("/fetchcreatedtests", {
    method: "post",
    interval: 15000,
  });
  const attempts = useResource("/me/attempts");
  const legacyId = params.get("TestID") || params.get("testID");
  if (legacyId)
    return (
      <Navigate
        replace
        to={`/dashboard/take?testID=${encodeURIComponent(legacyId)}`}
      />
    );
  const data = overview.data;
  return (
    <div>
      <PageHeading title="Overview">
        <Button to="/dashboard/create" variant="secondary" icon={FiPlus}>
          Create assessment
        </Button>
        <Button to="/dashboard/take" icon={FiTarget}>
          Take a test
        </Button>
      </PageHeading>
      <ErrorNotice message={overview.error} onRetry={overview.reload} />
      <div className="stats-grid">
        {[
          ["Created", data?.created, FiBookOpen],
          ["Ready", data?.ready, FiCheckCircle],
          ["Generating", data?.processing, FiClock],
          ["Completed", data?.attempts, FiTarget],
        ].map(([label, value, Icon]) => (
          <div className="stat-card" key={label}>
            <span className="stat-top">
              {label}
              <span
                className={`stat-icon stat-icon-${label.toLowerCase()}`}
                aria-hidden="true"
              >
                <Icon />
              </span>
            </span>
            <strong className="stat-value">{value ?? "—"}</strong>
          </div>
        ))}
      </div>
      <div className="overview-panels">
        <section className="panel">
          <div className="panel-heading">
            <h2>Recent assessments</h2>
            <SectionLink to="/dashboard/tests">View all</SectionLink>
          </div>
          <ErrorNotice message={tests.error} onRetry={tests.reload} />
          {tests.loading ? (
            <LoadingState />
          ) : tests.data?.length ? (
            <ul className="recent-list">
              {tests.data.slice(0, 5).map((test) => (
                <li key={test.testID}>
                  <Link
                    className="recent-row"
                    to={`/dashboard/take?testID=${test.testID}`}
                  >
                    <div>
                      <strong>{test.testName}</strong>
                      <small>
                        {test.questionCount} questions · {test.teamName}
                      </small>
                    </div>
                    {test.status === 'Done' ? <span className="row-action">Take test <FiArrowRight aria-hidden="true" /></span> : <Status value={test.status} />}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            !tests.error && (
              <EmptyState
                icon={FiBookOpen}
                title="No assessments yet"
                description="Create an assessment to get started."
              >
                <Button to="/dashboard/create">Create assessment</Button>
              </EmptyState>
            )
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Recent attempts</h2>
            <SectionLink to="/dashboard/results">View results</SectionLink>
          </div>
          <ErrorNotice message={attempts.error} onRetry={attempts.reload} />
          {attempts.loading ? (
            <LoadingState />
          ) : attempts.data?.length ? (
            <ul className="recent-list">
              {attempts.data.slice(0, 5).map((attempt) => (
                <li key={attempt.id}>
                  <Link
                    className="recent-row"
                    to={`/test?testID=${attempt.testID}`}
                  >
                    <div>
                      <strong>{attempt.testName}</strong>
                      <small>{formatDate(attempt.startTime)}{attempt.isEnded ? ` · ${attempt.results?.percentage ?? 0}% scored` : ''}</small>
                    </div>
                    <span className={`row-action ${attempt.isEnded || attempt.expired ? 'row-action-secondary' : ''}`}>
                      {attempt.isEnded || attempt.expired ? 'Review' : 'Resume'} <FiArrowRight aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            !attempts.error && (
              <EmptyState
                icon={FiTarget}
                title="No attempts yet"
                description="Your saved attempts and scores will appear here."
              >
                <Button to="/dashboard/take">
                  Take a test
                </Button>
              </EmptyState>
            )
          )}
        </section>
      </div>
    </div>
  );
}
