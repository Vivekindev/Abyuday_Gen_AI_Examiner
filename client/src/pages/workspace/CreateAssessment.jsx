import { useEffect, useState } from "react";
import PropTypes from 'prop-types';
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import {
  Button,
  ErrorNotice,
  LoadingState,
  PageHeading,
} from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import useResource from "../../hooks/useResource";

const models = [
  { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite" },
  { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash" },
];
const defaults = {
  testName: "",
  prompt: "",
  numQuestions: 10,
  difficulty: 5,
  selectedModel: models[0].id,
  teamId: "",
  assessmentMode: "",
  assessmentFormatSelected: false,
};
const readDraft = (key) => {
  try {
    const draft = JSON.parse(sessionStorage.getItem(key));
    if (!draft || typeof draft !== "object") return defaults;
    return {
      testName:
        typeof draft.testName === "string" ? draft.testName.slice(0, 80) : "",
      prompt:
        typeof draft.prompt === "string" ? draft.prompt.slice(0, 3000) : "",
      numQuestions:
        Number.isInteger(Number(draft.numQuestions)) &&
        draft.numQuestions >= 1 &&
        draft.numQuestions <= 50
          ? Number(draft.numQuestions)
          : 10,
      difficulty: [2, 5, 8].includes(Number(draft.difficulty))
        ? Number(draft.difficulty)
        : 5,
      selectedModel: models.some((model) => model.id === draft.selectedModel)
        ? draft.selectedModel
        : models[0].id,
      teamId: typeof draft.teamId === "string" ? draft.teamId : "",
      assessmentMode: draft.assessmentFormatSelected && ["mcq", "interactive"].includes(draft.assessmentMode) ? draft.assessmentMode : "",
      assessmentFormatSelected: draft.assessmentFormatSelected === true,
    };
  } catch {
    return defaults;
  }
};
export default function CreateAssessment() {
  const { me } = useOutletContext();
  return me ? <AssessmentForm key={me.id} userId={me.id} /> : <LoadingState />;
}
function AssessmentForm({ userId }) {
  const key = `abyuday:assessment-draft:${userId}`;
  const navigate = useNavigate();
  const location = useLocation();
  const teams = useResource("/teams");
  const [form, setForm] = useState(() => {
    const saved = readDraft(key);
    const request = location.state?.request;
    return request ? {
      ...saved,
      testName: request.title || saved.testName,
      prompt: request.topic || saved.prompt,
      numQuestions: request.questionCount || saved.numQuestions,
      difficulty: request.difficulty || saved.difficulty,
      teamId: location.state.teamId || saved.teamId,
      assessmentMode: "",
      assessmentFormatSelected: false,
    } : saved;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(form));
    } catch {
      /* Storage is optional. */
    }
  }, [form, key]);
  const change = (field, value) =>
    setForm((previous) => ({ ...previous, [field]: value, ...(field === 'assessmentMode' ? { assessmentFormatSelected: !!value } : {}), ...(field === 'assessmentMode' && value === 'interactive' ? { numQuestions: Math.min(20, Number(previous.numQuestions)) } : {}) }));
  const manageable = (teams.data || []).filter((team) =>
    !team.deleting && ["owner", "admin"].includes(team.role),
  );
  const unavailableTeam =
    form.teamId && !manageable.some((team) => team.id === form.teamId);
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (unavailableTeam) {
      setError(
        "This team is unavailable. Choose an audience before generating.",
      );
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/test/create", {
        ...form,
        numQuestions: Number(form.numQuestions),
        teamId: form.teamId || undefined,
      });
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* Storage is optional. */
      }
      toast.success("Assessment queued");
      navigate(`/dashboard/tests?created=${data.task.testID}`);
    } catch (requestError) {
      setError(
        errorMessage(
          requestError,
          "Could not create the assessment. Your draft has been kept.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="route-transition">
      <PageHeading
        title="Create assessment"
        description="Turn a topic into questions, experiments, and hands-on challenges."
      ><Button variant="secondary" to="/dashboard/labs">Try interactive examples</Button></PageHeading>
      <form className="panel creation-form create-layout form-stack" onSubmit={submit}>
        <ErrorNotice message={error} />
        <label className="field">Assessment format<select required value={form.assessmentMode} onChange={(event) => change('assessmentMode', event.target.value)}><option value="" disabled>Choose an assessment format</option><option value="mcq">Multiple choice only</option><option value="interactive">Interactive — choose activities for my topic</option></select><small>{form.assessmentMode === 'interactive' ? 'Chooses from pair connections, word puzzles, diagrams, code detective, number lines, circuits, graphs, and more to fit your topic. Each question is worth one point.' : form.assessmentMode === 'mcq' ? 'Four answer choices per question.' : 'Choose the type of questions you want to create.'}</small></label>
        {form.assessmentMode === 'interactive' && <div className="notice notice-info"><span>Describe what learners should change, calculate, label, or solve. Activities are chosen to fit your topic. Explore available formats in the Engine library.</span></div>}
        <label className="field">
          Name
          <input
            autoFocus
            value={form.testName}
            onChange={(event) => change("testName", event.target.value)}
            required
            minLength={2}
            maxLength={80}
            placeholder="e.g. JavaScript fundamentals"
          />
        </label>
        <label className="field">
          Topic
          <textarea
            value={form.prompt}
            onChange={(event) => change("prompt", event.target.value)}
            required
            minLength={8}
            maxLength={3000}
            rows={5}
            placeholder="Include the skills and topics you want to assess."
          />
        </label>
        <div className="form-grid">
          <label className="field">
            Questions
            <input
              type="number"
              min={1}
              max={form.assessmentMode === 'interactive' ? 20 : 50}
              required
              value={form.numQuestions}
              onChange={(event) => change("numQuestions", event.target.value)}
            />
            <small>{form.assessmentMode === 'interactive' ? '1–20 questions. Allow 1–10 minutes per task; the exact duration appears when ready.' : '1–50 questions, one minute each.'}</small>
          </label>
          <label className="field">
            Difficulty
            <select
              value={form.difficulty}
              onChange={(event) =>
                change("difficulty", Number(event.target.value))
              }
            >
              <option value={2}>Easy</option>
              <option value={5}>Medium</option>
              <option value={8}>Hard</option>
            </select>
          </label>
        </div>
        <label className="field">
          Audience
          <select
            value={form.teamId}
            onChange={(event) => change("teamId", event.target.value)}
            disabled={teams.loading}
          >
            <option value="">Personal</option>
            {unavailableTeam && (
              <option value={form.teamId} disabled>
                Team unavailable — select an audience
              </option>
            )}
            {manageable.map((team) => (
              <option value={team.id} key={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <small>
            {form.teamId
              ? "Only this team’s members can access the assessment."
              : "Anyone signed in with the assessment link can take it."}
          </small>
        </label>
        <ErrorNotice message={teams.error} onRetry={teams.reload} />
        <details className="advanced-settings">
          <summary>Advanced settings</summary>
          <label className="field">
            Generation model
            <select
              value={form.selectedModel}
              onChange={(event) => change("selectedModel", event.target.value)}
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </label>
        </details>
        <div className="form-actions">
          <span className="form-meta">Progress appears in Assessments.</span>
          <Button variant="secondary" to="/dashboard/tests">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={busy || (teams.loading && !!form.teamId)}
          >
            {busy ? "Creating…" : "Generate assessment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
AssessmentForm.propTypes = { userId: PropTypes.string.isRequired };
