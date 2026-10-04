import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FiArrowRight,
  FiBookOpen,
  FiClock,
  FiSearch,
  FiTarget,
} from "react-icons/fi";
import {
  Button,
  ErrorNotice,
  LoadingState,
  PageHeading,
  Status,
} from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { interactionNames } from '../../components/assessment/interactionMeta';
import RetryAssessmentButton from '../../components/RetryAssessmentButton';

export default function TakeAssessment() {
  const [params, setParams] = useSearchParams();
  const initialId = params.get("testID") || "";
  const [input, setInput] = useState(initialId);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!initialId) return;
    const controller = new AbortController();
    let timer;
    setInput(initialId);
    setLoading(true);
    setError("");
    setDetails(null);
    const load = async () => {
      try {
        const { data } = await api.post(
          "/test/getinfo",
          { testID: initialId },
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setDetails(data);
        setError("");
        if (["Queued", "queued", "Processing"].includes(data.status))
          timer = setTimeout(load, 10000);
      } catch (requestError) {
        if (!controller.signal.aborted)
          setError(
            errorMessage(
              requestError,
              requestError.response?.status === 403
                ? "This assessment is available only to its team members."
                : "We could not find that assessment. Check the ID and try again.",
            ),
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [initialId, revision]);
  const lookup = (event) => {
    event.preventDefault();
    setParams({ testID: input.trim() });
    if (input.trim() === initialId) setRevision((value) => value + 1);
  };
  return (
    <div className="route-transition">
      <PageHeading
        title="Take a test"
        description="Enter an assessment ID to begin."
      />
      <div className="take-layout">
        <div>
          <section className="panel lookup-form">
            <h2>Find your assessment</h2>
            <p>
              Enter the assessment ID shared with you. If it belongs to a team,
              make sure you’re a member.
            </p>
            <form onSubmit={lookup}>
              <label className="field" htmlFor="assessment-id">
                Assessment ID
              </label>
              <div className="lookup-controls">
                <input
                  className="input"
                  id="assessment-id"
                  placeholder="Paste your assessment ID"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  maxLength={64}
                  required
                />
                <Button type="submit" icon={FiSearch} disabled={loading}>
                  {loading ? "Finding…" : "Find assessment"}
                </Button>
              </div>
            </form>
          </section>
          <div style={{ marginTop: 20 }}>
            <ErrorNotice message={error} />
          </div>
          {loading && (
            <section className="panel">
              <LoadingState />
            </section>
          )}
          {details && (
            <section className="panel test-preview">
              <div className="preview-top">
                <span className="assessment-glyph">
                  <FiBookOpen />
                </span>
                <Status value={details.status} />
              </div>
              <h2>{details.name}</h2>
              <p>Created by {details.createdBy}</p>
              {details.questionKinds?.length > 0 && <p>{details.questionKinds.map((kind) => interactionNames[kind] || kind).join(' · ')}</p>}
              <div className="preview-meta">
                <div>
                  <FiBookOpen />
                  <strong>{details.noOfQuestions}</strong>
                  <span>Questions</span>
                </div>
                <div>
                  <FiClock />
                  <strong>{details.testTime}</strong>
                  <span>Time allowed</span>
                </div>
                <div>
                  <FiTarget />
                  <strong>{details.difficulty}</strong>
                  <span>Difficulty</span>
                </div>
              </div>
              {details.status === "Ready" ? (
                <>
                  <div className="notice notice-info">
                    <FiClock />
                    <span>
                      Your timer starts when you begin. An existing attempt will
                      resume, or show your result if it’s complete.
                    </span>
                  </div>
                  <Button
                    to={`/test?testID=${encodeURIComponent(details.id)}`}
                    className="btn-block"
                  >
                    Begin or resume assessment <FiArrowRight />
                  </Button>
                </>
              ) : (
                <div
                  className={`notice ${details.status === "Error" ? "notice-error" : "notice-info"}`}
                >
                  <FiClock />
                  <span>
                    {details.status === "Error"
                      ? details.canRetry
                        ? "Question generation failed. Retry to run generation again with the same assessment ID. Another attempt uses AI quota and may still fail."
                        : "Question generation failed. Ask the creator or a team admin to retry this assessment."
                      : `Your questions are being prepared${details.generationStage && details.generationStage !== 'queued' ? ` (${details.generationStage.replaceAll('-', ' ')})` : ''}. This page checks for updates automatically.`}
                  </span>
                </div>
              )}
              {details.status === 'Error' && details.canRetry && <RetryAssessmentButton testID={details.id} name={details.name} onRetried={() => setRevision((value) => value + 1)} />}
              {details.status === 'Error' && details.generationError && <p role="status"><strong>{details.generationError.stage?.replaceAll('-', ' ')}:</strong> {details.generationError.message}</p>}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
