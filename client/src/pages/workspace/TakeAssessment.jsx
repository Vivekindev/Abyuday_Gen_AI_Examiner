import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FiArrowRight,
  FiBookOpen,
  FiClock,
  FiCheckCircle,
  FiPlay,
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
  const [lookupOpen, setLookupOpen] = useState(false);
  const previewHeading = useRef(null);
  const focusPreview = useRef(false);
  useEffect(() => {
    if (details && focusPreview.current) {
      focusPreview.current = false;
      previewHeading.current?.focus();
    }
  }, [details]);
  useEffect(() => {
    if (!initialId) {
      setDetails(null);
      setInput('');
      setLoading(false);
      setError('');
      return;
    }
    const controller = new AbortController();
    let timer;
    let firstLoad = true;
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
        if (firstLoad) setLookupOpen(false);
        firstLoad = false;
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
    if (!input.trim()) return;
    focusPreview.current = true;
    setParams({ testID: input.trim() });
    if (input.trim() === initialId) setRevision((value) => value + 1);
  };
  const isReview = ['completed', 'expired'].includes(details?.attemptStatus);
  const isResume = details?.attemptStatus === 'in_progress';
  const actionLabel = isReview ? 'Review my answers' : isResume ? 'Resume assessment' : 'Start assessment';
  return (
    <div className="route-transition">
      <PageHeading
        title="Take a test"
        description="Find your assessment, get ready, and take the next step."
      />
      <div className="take-layout">
        <div>
          <section className={`panel lookup-form ${details && !lookupOpen ? 'lookup-compact' : ''}`}>
            <div className="lookup-heading"><h2>{details ? 'Assessment found' : 'Find your assessment'}</h2>{details && <Button variant="ghost" className="btn-sm" onClick={() => setLookupOpen(!lookupOpen)} aria-expanded={lookupOpen} aria-controls="assessment-lookup">{lookupOpen ? 'Hide lookup' : 'Change ID'}</Button>}</div>
            <p id="assessment-id-hint" hidden={!!details && !lookupOpen}>
              Enter the assessment ID shared with you. If it belongs to a team,
              make sure you’re a member.
            </p>
            <form onSubmit={lookup} id="assessment-lookup" hidden={!!details && !lookupOpen}>
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
                  aria-describedby="assessment-id-hint"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                />
                <Button type="submit" icon={FiSearch} disabled={loading || !input.trim()} aria-busy={loading}>
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
            <section className={`panel test-preview ${details.status === 'Ready' ? 'test-preview-ready' : ''}`} aria-labelledby="assessment-preview-title">
              <div className="preview-top">
                <span className="assessment-glyph">
                  <FiBookOpen />
                </span>
                <Status value={details.status} />
              </div>
              <h2 id="assessment-preview-title" tabIndex={-1} ref={previewHeading}>{details.name}</h2>
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
                  <div className="assessment-launch">
                    <div className="launch-heading"><span className="launch-icon" aria-hidden="true">{isReview ? <FiCheckCircle /> : <FiPlay />}</span><div><h3>{isReview ? 'Your attempt is ready to review' : isResume ? 'Pick up where you left off' : 'Ready when you are'}</h3><p id="launch-hint">{isReview ? 'See your score and explanations. You can start another attempt after reviewing.' : isResume ? 'Your saved responses are waiting. Your timer is already running.' : 'Your timer starts only when you press Start assessment. Answers save as you go.'}</p></div></div>
                    <Button to={`/test?testID=${encodeURIComponent(details.id)}`} className="btn-block btn-lg" aria-describedby="launch-hint">
                      {actionLabel} <FiArrowRight aria-hidden="true" />
                    </Button>
                  </div>
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
        <aside className="panel take-guide" aria-labelledby="take-guide-title">
          <span className="take-guide-icon" aria-hidden="true"><FiTarget /></span>
          <h2 id="take-guide-title">A little focus goes a long way.</h2>
          <p>Settle in before you start.</p>
          <ul>
            <li><FiClock aria-hidden="true" /><div><strong>Make time</strong><span>The timer keeps running if you leave the assessment.</span></div></li>
            <li><FiCheckCircle aria-hidden="true" /><div><strong>Go at your pace</strong><span>Answers save automatically. You can move between questions.</span></div></li>
            <li><FiBookOpen aria-hidden="true" /><div><strong>Review before you finish</strong><span>Flag tricky questions and return to them before submitting.</span></div></li>
          </ul>
          <Button variant="secondary" to="/dashboard/tests" className="btn-block">Browse assessments <FiArrowRight aria-hidden="true" /></Button>
        </aside>
      </div>
    </div>
  );
}
