const str = { type: 'string' };
const number = { type: 'number' };
const array = (items, minItems, maxItems) => ({ type: 'array', items, ...(minItems === undefined ? {} : { minItems, maxItems }) });
const object = (properties) => ({ type: 'object', properties, required: Object.keys(properties) });
const itemId = { type: 'string', enum: Array.from({ length: 8 }, (_, i) => `i${i + 1}`) };
const categoryId = { type: 'string', enum: Array.from({ length: 5 }, (_, i) => `c${i + 1}`) };
const card = object({ id: itemId, label: { ...str, description: 'Nonempty label, at most 300 characters.' } });
const category = object({ id: categoryId, label: { ...str, description: 'Plain category name, at most 300 characters.' } });
const circuitState = object({ r1: number, r2: number, topology: { type: 'string', enum: ['series', 'parallel'] }, closed: { type: 'boolean' } });
const graphState = object({ slope: number, intercept: number });

export const agents = {
  mcq: {
    name: 'knowledge-author',
    instructions: 'Write four distinct options and one unambiguous correct answer that exactly matches an option.',
    fields: { options: array({ ...str, description: 'At most 400 characters.' }, 4, 4), answer: str },
  },
  circuit: {
    name: 'electronics-author',
    instructions: 'Design an ideal DC two-resistor circuit challenge. The learner can change R1, R2, switch open/closed and series/parallel topology. Only total supply current is graded. Supply 1–24 V; 2–8 distinct resistorChoices of 100–100000 ohms. Choose a reachable positive targetCurrentMa with toleranceMa at most 5% of target. Calculate using I(mA)=1000*V/R, series R=R1+R2, parallel R=R1*R2/(R1+R2). The initial state must NOT meet the target. Do not add any ungraded constraint such as requiring a particular topology or R1. Include a worked solution in explanation. This engine cannot model AC, diodes, transistors or arbitrary wiring.',
    fields: { config: object({ voltage: number, resistorChoices: array(number), targetCurrentMa: number, toleranceMa: number, initial: circuitState }) },
  },
  graph: {
    name: 'graph-author',
    instructions: 'Create a linear graph task y=m*x+b. Student adjusts slope and intercept from -5 to 5 in steps of 0.5. Supply 2–5 target points with distinct x in [-5,5], y in [-10,10]. All points must lie on one line reachable with those controls. tolerance between 0.001 and 0.1. Initial line must NOT solve the task. Only matching all target points is graded. Include worked solution in explanation. No nonlinear graphs.',
    fields: { config: object({ points: array(object({ x: number, y: number })), tolerance: number, initial: graphState }) },
  },
  ordering: {
    name: 'sequence-author',
    instructions: 'Create 3–8 steps or code lines with one objectively correct sequence. Avoid independent steps with multiple valid orderings. Items have unique ids i1, i2, etc and labels under 300 chars (use backticks for code lines). Present config.items in SHUFFLED order. answer is the ordered array of ids. State the ordering criterion explicitly in questionText. Do not prefix labels with their correct position.',
    fields: { config: object({ items: array(card, 3, 8) }), answer: array(itemId, 3, 8) },
  },
  matching: {
    name: 'classification-author',
    instructions: 'Create 3–8 items and 2–5 categories. Item IDs must be i1 through i8; category IDs must be c1 through c5, unique within each list. Each item belongs to exactly one category; several items can share a category. Labels under 300 chars. Return assignments in the SAME order as config.items, each with itemId and categoryId. Avoid ambiguous categories. State the classification criterion in questionText.',
    fields: { config: object({ items: array(card, 3, 8), categories: array(category, 2, 5) }), assignments: array(object({ itemId, categoryId }), 3, 8) },
  },
};

const plannedQuestion = object({ kind: { type: 'string', enum: [...Object.keys(agents), 'dynamic'] }, domain: str, objective: str });
plannedQuestion.properties.engineKey = str;
plannedQuestion.properties.engineRequirement = str;
export const plannerSchema = object({ questions: array(plannedQuestion) });
export const authorSchema = (kind, count) => array(object({ questionText: { ...str, description: 'At most 2000 characters.' }, tag: array({ ...str, description: 'At most 80 characters.' }, 0, 8), explanation: { ...str, description: 'At most 3000 characters.' }, ...agents[kind].fields }), count, count);
