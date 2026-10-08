import { useId, useState } from 'react';
import PropTypes from 'prop-types';
import { FiArrowRight, FiCheck, FiChevronDown, FiFlag, FiX } from 'react-icons/fi';
import { Button } from '../ui';
import { responsePresent } from './interactionMeta';

export default function QuestionNavigator({ questions, answers, active, flagged, ended, outcomes, busy, onNavigate, onSubmit }) {
  const [expanded, setExpanded] = useState(false);
  const mapId = useId();
  const answered = questions.filter((question, index) => responsePresent(question, answers[index])).length;
  const percent = questions.length ? Math.round(answered / questions.length * 100) : 0;
  const navigate = (index) => {
    setExpanded(false);
    onNavigate(index);
  };
  const findNext = (predicate) => {
    for (let step = 1; step <= questions.length; step += 1) {
      const index = (active + step) % questions.length;
      if (predicate(index)) return navigate(index);
    }
  };
  return (
    <aside className="assessment-sidebar" aria-label="Assessment progress">
      <section className={`panel question-map ${expanded ? 'map-expanded' : ''}`}>
        <div className="question-map-heading">
          <h2>{ended ? 'Answer review' : 'Your progress'}</h2>
          <span className="map-percentage">{percent}%</span>
        </div>
        <p className="exam-progress-label">{answered} of {questions.length} answered</p>
        <progress className="exam-progress" value={answered} max={questions.length} aria-label="Questions answered">{percent}%</progress>
        <button type="button" className="question-map-toggle" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-controls={mapId}>
          {expanded ? 'Hide question map' : 'Show question map'}
          <FiChevronDown aria-hidden="true" />
        </button>
        <div id={mapId} className="question-map-content">
          {!ended && <div className="map-shortcuts">
            <button type="button" disabled={answered === questions.length} onClick={() => findNext((index) => !responsePresent(questions[index], answers[index]))}>Unanswered <strong>{questions.length - answered}</strong></button>
            <button type="button" disabled={!flagged.size} onClick={() => findNext((index) => flagged.has(index))}><FiFlag aria-hidden="true" /> Flagged <strong>{flagged.size}</strong></button>
          </div>}
          <nav className="question-grid" aria-label="Question navigation">
            {questions.map((question, index) => {
              const hasAnswer = responsePresent(question, answers[index]);
              const isCorrect = outcomes?.[index]?.correct ?? (answers[index] === question.answer);
              const state = !hasAnswer ? 'unanswered' : ended ? isCorrect ? 'correct' : 'incorrect' : 'answered';
              const isFlagged = !ended && flagged.has(index);
              return <button type="button" key={index} onClick={() => navigate(index)} aria-label={`Question ${index + 1}, ${state}${isFlagged ? ', flagged for review' : ''}`} aria-current={active === index ? 'step' : undefined} className={`${active === index ? 'current' : ''} ${state} ${isFlagged ? 'flagged' : ''}`}>
                {index + 1}
                <span className="map-question-mark" aria-hidden="true">{isFlagged ? <FiFlag /> : hasAnswer ? ended && !isCorrect ? <FiX /> : <FiCheck /> : null}</span>
              </button>;
            })}
          </nav>
          <div className="map-legend" aria-hidden="true">
            <span><FiCheck />{ended ? 'Correct' : 'Answered'}</span>
            <span>{ended ? <FiX /> : <FiFlag />}{ended ? 'Incorrect' : 'Flagged'}</span>
          </div>
          {!ended && <>
            <Button className="btn-block" variant="secondary" disabled={busy} onClick={onSubmit}>Review & submit <FiArrowRight aria-hidden="true" /></Button>
            <p className="map-hint">You can skip a question and come back before submitting.</p>
          </>}
        </div>
      </section>
    </aside>
  );
}

QuestionNavigator.propTypes = {
  questions: PropTypes.array.isRequired,
  answers: PropTypes.array.isRequired,
  active: PropTypes.number.isRequired,
  flagged: PropTypes.instanceOf(Set).isRequired,
  ended: PropTypes.bool,
  outcomes: PropTypes.array,
  busy: PropTypes.bool,
  onNavigate: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};
