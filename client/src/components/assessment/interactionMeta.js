import { ACTIVITY_TEMPLATES, activityProgress } from '../../../../shared/activityTemplates.js';

export const interactionNames = { mcq: 'Multiple choice', circuit: 'Circuit lab', graph: 'Graph lab', ordering: 'Sequence builder', matching: 'Category board', dynamic: 'Custom workbench', ...Object.fromEntries(Object.entries(ACTIVITY_TEMPLATES).map(([kind, item]) => [kind, item.name])) };
export const responsePresent = (question, value) => {
  if (Object.hasOwn(ACTIVITY_TEMPLATES, question?.kind || 'mcq')) return activityProgress(question, value).answered > 0;
  return ['matching', 'dynamic'].includes(question?.kind) ? value && Object.values(value).some((v) => v !== '') : !!value;
};
