import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiFlag,
  FiLoader,
  FiShield,
  FiX,
  FiZap,
} from "react-icons/fi";
import { Button, ErrorNotice, Modal, PageLoader } from "../components/ui";
import { api, errorMessage } from "../lib/api";
import ThemeToggle from "../theme/ThemeToggle";
import "./exam.css";

const formatTime = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
export default function Dashboard() {
  const testID = new URLSearchParams(useLocation().search).get("testID");
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [title, setTitle] = useState("Your assessment");
  const [answers, setAnswers] = useState([]);
  const [active, setActive] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [explanations, setExplanations] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [dialog, setDialog] = useState(null);
  const deadline = useRef(0);
  const savingRef = useRef(false);
  const ready = !!session;
  const ended = session?.isEnded;

  useEffect(() => {
    if (!testID) {
      setError("An assessment ID is required.");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setSession(null);
    setError("");
    setActive(0);
    setFlagged(new Set());
    setExplanations({});
    api
      .post("/test/begin", { testID }, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setSession(data);
        setAnswers(data.selectedOptions || []);
        setRemaining(data.remTime);
        deadline.current = Date.now() + data.remTime * 1000;
      })
      .catch((requestError) => {
        if (!controller.signal.aborted)
          setError(
            errorMessage(requestError, "We could not open this assessment."),
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    api
      .post("/test/getinfo", { testID }, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setTitle(data.name);
          document.title = `${data.name} · Abyuday`;
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [testID, revision]);

  useEffect(() => {
    if (!ready || ended) return;
    const controller = new AbortController();
    const timer = setInterval(
      () =>
        setRemaining(
          Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)),
        ),
      1000,
    );
    const sync = setInterval(async () => {
      try {
        const { data } = await api.post(
          "/test/remtime",
          { testID },
          { signal: controller.signal },
        );
        deadline.current = Date.now() + data.remTime * 1000;
        setRemaining(data.remTime);
        if (data.isEnded) {
          const result = await api.post(
            "/test/begin",
            { testID },
            { signal: controller.signal },
          );
          setSession(result.data);
          setAnswers(result.data.selectedOptions);
          setDialog(null);
        }
      } catch {
        if (!controller.signal.aborted)
          setError(
            "Connection interrupted. Your saved answers are safe. We’ll keep trying to reconnect.",
          );
      }
    }, 15000);
    return () => {
      controller.abort();
      clearInterval(timer);
      clearInterval(sync);
    };
  }, [ready, ended, testID]);

  useEffect(() => {
    if (!ready || ended || remaining > 0) return;
    const controller = new AbortController();
    api
      .post("/test/submit", { testID }, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setSession(data);
          setAnswers(data.selectedOptions);
          setDialog(null);
          setError("");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Time has ended. Reload to view your saved result.");
      });
    return () => controller.abort();
  }, [ready, ended, remaining, testID]);

  useEffect(() => {
    if (!saving) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saving]);

  const chooseAnswer = async (option) => {
    if (savingRef.current || submitting || ended || remaining === 0) return;
    const previous = answers;
    const next = [...answers];
    next[active] = option;
    savingRef.current = true;
    setAnswers(next);
    setSaving(true);
    try {
      await api.post("/test/saveoptions", { testID, selectedOptions: next });
      setError("");
    } catch (requestError) {
      setAnswers(previous);
      setError(
        errorMessage(
          requestError,
          "That answer was not saved. Please select it again.",
        ),
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const submit = async () => {
    if (submitting || savingRef.current) return;
    setSubmitting(true);
    try {
      const { data } = await api.post("/test/submit", {
        testID,
        selectedOptions: answers,
      });
      setSession(data);
      setAnswers(data.selectedOptions);
      setRemaining(0);
      setError("");
      setDialog(null);
    } catch (requestError) {
      setError(
        errorMessage(
          requestError,
          "Could not submit. Your saved answers are still here.",
        ),
      );
      setDialog(null);
    } finally {
      setSubmitting(false);
    }
  };
  const explain = async (index) => {
    if (explanations[index]?.loading) return;
    setExplanations((previous) => ({
      ...previous,
      [index]: { loading: true },
    }));
    try {
      const { data } = await api.post("/generate-summary", {
        testID,
        questionIndex: index,
      });
      setExplanations((previous) => ({
        ...previous,
        [index]: { text: data.summary },
      }));
    } catch {
      setExplanations((previous) => ({
        ...previous,
        [index]: {
          error: "Explanation is unavailable right now. Try again shortly.",
        },
      }));
    }
  };
  const flag = () =>
    setFlagged((previous) => {
      const next = new Set(previous);
      if (next.has(active)) next.delete(active);
      else next.add(active);
      return next;
    });
  if (loading) return <PageLoader />;
  if (!session)
    return (
      <main className="standalone-page">
        <div className="standalone-panel panel">
          <span className="empty-icon">
            <FiShield />
          </span>
          <h1>Unable to open assessment</h1>
          <ErrorNotice
            message={error}
            onRetry={
              testID ? () => setRevision((value) => value + 1) : undefined
            }
          />
          <Button to="/dashboard/take" icon={FiArrowLeft}>
            Find an assessment
          </Button>
        </div>
      </main>
    );
  const questions = session.testQuestions;
  const question = questions[active];
  const answered = answers.filter(Boolean).length;
  const correct = answers[active] === question.answer;
  return (
    <div className="assessment-experience">
      <header className="assessment-topbar">
        <button
          className="exam-back"
          onClick={() =>
            ended ? navigate("/dashboard/results") : setDialog("leave")
          }
        >
          <FiArrowLeft />
          <span>Back to workspace</span>
        </button>
        <span className="exam-mode">
          <FiShield />
          {ended ? "Assessment review" : "Focus mode"}
        </span>
        <ThemeToggle />
      </header>
      <main className="assessment-container">
        <div className="assessment-heading">
          <div>
            <h1>{title}</h1>
            <p>
              {questions.length} questions <span>·</span> Multiple choice{" "}
              <span>·</span> {ended ? "Completed" : "In progress"}
            </p>
          </div>
          {!ended && (
            <div
              className={`assessment-timer ${remaining < 60 ? "timer-urgent" : ""}`}
              role="timer"
              aria-label={`${remaining} seconds remaining`}
            >
              <FiClock />
              <div>
                <small>Time remaining</small>
                <strong>{formatTime(remaining)}</strong>
              </div>
            </div>
          )}
        </div>
        <ErrorNotice
          message={error}
          onRetry={
            remaining === 0
              ? () => setRevision((value) => value + 1)
              : undefined
          }
        />
        {ended && (
          <section className="score-summary">
            <div
              className="score-ring"
              style={{ "--score": `${session.results?.percentage || 0}%` }}
            >
              <span>
                <strong>
                  {session.results?.percentage ?? 0}
                  <small>%</small>
                </strong>
                <span>Your score</span>
              </span>
            </div>
            <div className="score-summary-copy">
              <h2>Assessment complete</h2>
              <p>
                Review your answers and explore the reasoning behind each one.
              </p>
            </div>
            <div className="score-breakdown">
              <div>
                <strong>{session.results?.score ?? 0}</strong>
                <span>
                  <i className="correct-dot" />
                  Correct
                </span>
              </div>
              <div>
                <strong>{session.results?.incorrect ?? 0}</strong>
                <span>
                  <i className="incorrect-dot" />
                  Incorrect
                </span>
              </div>
              <div>
                <strong>{session.results?.unanswered ?? 0}</strong>
                <span>
                  <i />
                  Unanswered
                </span>
              </div>
            </div>
          </section>
        )}
        <div className="assessment-grid">
          <section className="question-panel panel">
            <div className="question-top">
              <span className="question-counter">
                Question {String(active + 1).padStart(2, "0")}{" "}
                <small>/ {String(questions.length).padStart(2, "0")}</small>
              </span>
              {!ended ? (
                <button
                  className={`flag-button ${flagged.has(active) ? "flagged" : ""}`}
                  onClick={flag}
                  aria-pressed={flagged.has(active)}
                >
                  <FiFlag />
                  {flagged.has(active)
                    ? "Flagged for review"
                    : "Flag for review"}
                </button>
              ) : (
                <span
                  className={`answer-outcome ${correct ? "is-correct" : "is-incorrect"}`}
                >
                  {correct ? <FiCheckCircle /> : <FiX />}
                  {correct
                    ? "Correct answer"
                    : answers[active]
                      ? "Incorrect answer"
                      : "Not answered"}
                </span>
              )}
            </div>
            <div className="question-body">
              <h2>{question.questionText}</h2>
              <p className="question-instruction">
                {ended
                  ? "Your response and the correct answer are shown below."
                  : "Select the best answer."}
              </p>
              <fieldset
                disabled={ended || saving || submitting || remaining === 0}
                className="question-options"
              >
                <legend className="sr-only">Choose one answer</legend>
                {question.options.map((option, index) => (
                  <label
                    key={index}
                    className={`question-option ${answers[active] === option ? "is-selected" : ""} ${ended && question.answer === option ? "is-correct" : ""} ${ended && answers[active] === option && !correct ? "is-incorrect" : ""}`}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name={`question-${active}`}
                      checked={answers[active] === option}
                      onChange={() => chooseAnswer(option)}
                    />
                    <span className="option-letter">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="option-text">{option}</span>
                    <span className="option-indicator">
                      {ended && question.answer === option ? (
                        <FiCheck />
                      ) : ended && answers[active] === option ? (
                        <FiX />
                      ) : answers[active] === option ? (
                        <span />
                      ) : null}
                    </span>
                  </label>
                ))}
              </fieldset>
              {!ended && answers[active] && (
                <button
                  className="clear-answer"
                  disabled={saving || submitting}
                  onClick={() => chooseAnswer("")}
                >
                  Clear my selection
                </button>
              )}
              {ended && (
                <div className="explanation-block">
                  <div>
                    <span>
                      <FiZap /> Answer explanation
                    </span>
                    <Button
                      variant="secondary"
                      className="btn-sm"
                      onClick={() => explain(active)}
                      disabled={explanations[active]?.loading}
                    >
                      {explanations[active]?.loading
                        ? "Thinking…"
                        : explanations[active]?.text
                          ? "Explain again"
                          : "Explain this answer"}
                    </Button>
                  </div>
                  {explanations[active]?.text && (
                    <p>{explanations[active].text}</p>
                  )}
                  {explanations[active]?.error && (
                    <p role="alert">{explanations[active].error}</p>
                  )}
                </div>
              )}
            </div>
            <div className="question-footer">
              <Button
                variant="secondary"
                icon={FiArrowLeft}
                disabled={active === 0}
                onClick={() => setActive((value) => value - 1)}
              >
                Previous
              </Button>
              <span className="answer-save-status" role="status">
                {ended ? (
                  <>
                    <FiCheckCircle />
                    Completed
                  </>
                ) : saving ? (
                  <>
                    <FiLoader className="spin" />
                    Saving answer…
                  </>
                ) : error ? (
                  "Check connection"
                ) : (
                  <>
                    <FiCheck />
                    Answers saved
                  </>
                )}
              </span>
              {active < questions.length - 1 ? (
                <Button onClick={() => setActive((value) => value + 1)}>
                  Next question <FiArrowRight />
                </Button>
              ) : ended ? (
                <Button to="/dashboard/results">
                  All results <FiArrowRight />
                </Button>
              ) : (
                <Button
                  onClick={() => setDialog("submit")}
                  disabled={saving || submitting}
                >
                  Review & submit <FiCheck />
                </Button>
              )}
            </div>
          </section>
          <aside className="assessment-sidebar">
            <section className="panel question-map">
              <h2>{ended ? "Review your answers" : "Your progress"}</h2>
              <div className="exam-progress-label">
                <span>
                  {answered} of {questions.length} answered
                </span>
                <strong>
                  {Math.round((answered / questions.length) * 100)}%
                </strong>
              </div>
              <div className="exam-progress-track">
                <span
                  style={{ width: `${(answered / questions.length) * 100}%` }}
                />
              </div>
              <nav className="question-grid" aria-label="Question navigation">
                {questions.map((item, index) => (
                  <button
                    type="button"
                    key={index}
                    onClick={() => setActive(index)}
                    aria-label={`Question ${index + 1}${answers[index] ? ", answered" : ", unanswered"}${flagged.has(index) ? ", flagged" : ""}`}
                    aria-current={active === index ? "step" : undefined}
                    className={`${active === index ? "current" : ""} ${answers[index] ? "answered" : ""} ${!ended && flagged.has(index) ? "flagged" : ""} ${ended && answers[index] ? (answers[index] === item.answer ? "correct" : "incorrect") : ""}`}
                  >
                    {index + 1}
                    {!ended && flagged.has(index) && <i />}
                  </button>
                ))}
              </nav>
              <div className="map-legend">
                <span>
                  <i className="legend-answered" />
                  {ended ? "Correct" : "Answered"}
                </span>
                <span>
                  <i />
                  Unanswered
                </span>
                <span>
                  <i
                    className={ended ? "legend-incorrect" : "legend-flagged"}
                  />
                  {ended ? "Incorrect" : "Flagged"}
                </span>
              </div>
              {!ended && (
                <Button
                  className="btn-block"
                  disabled={submitting || saving}
                  onClick={() => setDialog("submit")}
                >
                  Review & submit <FiArrowRight />
                </Button>
              )}
            </section>
          </aside>
        </div>
      </main>
      <Modal
        open={!!dialog}
        onClose={() => {
          if (!submitting) setDialog(null);
        }}
        title={
          dialog === "leave"
            ? "Leave this assessment for now?"
            : "Ready to finish?"
        }
        description={
          dialog === "leave"
            ? "Your saved answers will be here when you return. The timer will keep running."
            : "Take a moment to check your progress. You cannot change answers after submitting."
        }
      >
        {dialog === "submit" && (
          <div className="submit-review">
            <div>
              <strong>{answered}</strong>
              <span>Answered</span>
            </div>
            <div>
              <strong>{questions.length - answered}</strong>
              <span>Unanswered</span>
            </div>
            <div>
              <strong>{flagged.size}</strong>
              <span>Flagged</span>
            </div>
          </div>
        )}
        <div className="form-actions">
          <Button
            variant="secondary"
            disabled={submitting}
            onClick={() => setDialog(null)}
          >
            {dialog === "leave" ? "Keep going" : "Continue reviewing"}
          </Button>
          <Button
            disabled={saving || submitting}
            onClick={
              dialog === "leave" ? () => navigate("/dashboard/results") : submit
            }
          >
            {dialog === "leave"
              ? "Leave assessment"
              : submitting
                ? "Submitting…"
                : "Submit assessment"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
