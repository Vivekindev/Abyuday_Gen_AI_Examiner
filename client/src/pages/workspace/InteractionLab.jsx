import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiCheckCircle, FiArrowRight, FiRefreshCw } from 'react-icons/fi';
import { Button, PageHeading, SectionHeading } from '../../components/ui';
import InteractiveQuestion from '../../components/assessment/InteractiveQuestion';
import { interactionNames } from '../../components/assessment/interactionMeta';
import { interactionExamples } from '../../components/assessment/examples';
import { activityExamples } from '../../components/assessment/activityExamples';
import { ACTIVITY_TEMPLATES, activityProgress, gradeActivity } from '../../../../shared/activityTemplates.js';
import RichContent from '../../components/content/RichContent';
import FormattingPlayground from '../../components/content/FormattingPlayground';

const examples = [...activityExamples, ...interactionExamples];
const descriptions = { circuit: 'Change resistors and connections to meet a current target.', graph: 'Move a line through measured points using live sliders.', ordering: 'Arrange a process into a meaningful sequence.', matching: 'Sort related ideas onto a category board.' };

export default function InteractionLab() {
  const [params, setParams] = useSearchParams();
  const requestedIndex = examples.findIndex((q) => q.kind === params.get('activity'));
  const index = requestedIndex < 0 ? 0 : requestedIndex;
  const [answers, setAnswers] = useState({});
  const [review, setReview] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [revision, setRevision] = useState(0);
  const [solved, setSolved] = useState([]);
  const question = examples[index];
  const template = ACTIVITY_TEMPLATES[question.kind];
  const value = answers[question.kind] ?? '';
  const check = () => {
    if (!activityProgress(question, value).answered) { setFeedback('empty'); return; }
    const correct = gradeActivity(question, value);
    setFeedback(correct ? 'correct' : 'retry');
    if (correct && !solved.includes(question.kind)) setSolved([...solved, question.kind]);
  };
  return <div className="route-transition activity-playground">
    <PageHeading title="Interaction playground" description="Connect, investigate, build, and explore. Find an activity that fits your topic."><Button to="/dashboard/create">Create an assessment <FiArrowRight /></Button></PageHeading>
    <SectionHeading title="Choose an activity" description="Explore a practice question, adjust your response, and review the solution."><span className="soft-tag">{examples.length} activity formats</span></SectionHeading>
    <nav className="activity-gallery" aria-label="Choose an activity">{examples.map((q, i) => <button key={q.kind} aria-pressed={i === index} onClick={() => { setParams({ activity: q.kind }, { replace: true }); setReview(false); setFeedback(null); }}>
      <span className="gallery-card-top"><span className="gallery-number">{String(i + 1).padStart(2, '0')}</span>{solved.includes(q.kind) && <FiCheckCircle aria-label="Solved" />}</span>
      <strong>{interactionNames[q.kind]}</strong><span>{ACTIVITY_TEMPLATES[q.kind]?.description || descriptions[q.kind]}</span><small>{q.tag[0]} · {q.tag[1]}</small>
    </button>)}</nav>
    <section className="panel lab-preview-panel">
      <div className="playground-question-meta"><span>{interactionNames[question.kind]}</span><span>{question.tag.join(' / ')}</span></div>
      <RichContent text={question.questionText} className="assessment-question-content" />
      <InteractiveQuestion key={`${question.kind}:${revision}`} question={question} value={value} onChange={(next) => { setAnswers((previous) => ({ ...previous, [question.kind]: next })); setFeedback(null); }} review={review} />
      {feedback && <div role="status" className={`practice-feedback ${feedback === 'correct' ? 'practice-solved' : ''}`}>{feedback === 'correct' && <FiCheckCircle aria-hidden="true" />}<div><strong>{feedback === 'correct' ? 'You solved it!' : feedback === 'empty' ? 'Give it a try first' : 'Keep exploring'}</strong><p>{feedback === 'correct' ? 'Your response meets the challenge. Try another activity or explore the explanation.' : feedback === 'empty' ? 'Make a selection, connect a pair, or place your marker before checking.' : 'Some of your selections need another look. Adjust them and check again, or explore the solution.'}</p></div></div>}
      <div className="form-actions playground-actions"><Button variant="secondary" icon={FiRefreshCw} onClick={() => { setAnswers((previous) => ({ ...previous, [question.kind]: '' })); setReview(false); setFeedback(null); setRevision((n) => n + 1); }}>Reset</Button><Button variant="ghost" onClick={() => { setReview(!review); setFeedback(null); }}>{review ? 'Back to activity' : 'Explore solution'}</Button>{template && <Button onClick={check} disabled={review}>Check answer</Button>}</div>
      <p className="lab-preview-note">Practice examples only. No timer or saved scores. During an assessment, answers are checked after submission.</p>
    </section>
    <FormattingPlayground />
  </div>;
}
