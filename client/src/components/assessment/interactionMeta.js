export const interactionNames = { mcq: 'Multiple choice', circuit: 'Circuit lab', graph: 'Graph lab', ordering: 'Sequence builder', matching: 'Category board', dynamic: 'Custom workbench' };
export const responsePresent = (question, value) => ['matching', 'dynamic'].includes(question?.kind)
  ? value && Object.values(value).some(Boolean) : !!value;
