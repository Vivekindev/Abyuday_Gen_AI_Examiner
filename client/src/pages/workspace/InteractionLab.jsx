import { useState } from 'react';
import { Button, PageHeading } from '../../components/ui';
import InteractiveQuestion from '../../components/assessment/InteractiveQuestion';
import { interactionNames } from '../../components/assessment/interactionMeta';
import { interactionExamples } from '../../components/assessment/examples';
import RichContent from '../../components/content/RichContent';
import FormattingPlayground from '../../components/content/FormattingPlayground';

export default function InteractionLab() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [review, setReview] = useState(false);
  const question = interactionExamples[index];
  return <div className="route-transition">
    <PageHeading title="Interaction playground" description="Explore what a hands-on assessment feels like."><Button to="/dashboard/create">Create an assessment</Button></PageHeading>
    <p className="lab-preview-note">These are built-in practice examples. No timer, AI calls, or saved scores. Generated assessments use the same interactive controls.</p>
    <nav className="lab-preview-tabs" aria-label="Interaction examples">{interactionExamples.map((q, i) => <button key={q.kind} aria-pressed={i === index} onClick={() => { setIndex(i); setReview(false); }}>{interactionNames[q.kind]}</button>)}</nav>
    <section className="panel lab-preview-panel"><RichContent text={question.questionText} className="assessment-question-content" /><InteractiveQuestion question={question} value={answers[index]} onChange={(value) => setAnswers((previous) => ({ ...previous, [index]: value }))} review={review} />
      <div className="form-actions"><Button variant="secondary" onClick={() => { setAnswers((previous) => ({ ...previous, [index]: '' })); setReview(false); }}>Reset example</Button><Button onClick={() => setReview(!review)}>{review ? 'Hide solution' : 'Explore solution'}</Button></div>
    </section>
    <FormattingPlayground />
  </div>;
}
