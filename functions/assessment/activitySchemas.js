const str = { type: 'string' };
const number = { type: 'number' };
const integer = { type: 'integer' };
const array = (items, minItems, maxItems) => ({ type: 'array', items, minItems, maxItems });
const object = (properties) => ({ type: 'object', properties, required: Object.keys(properties) });
const card = object({ id: str, label: str });

export const activityAgents = {
  pairs: {
    name: 'pair-author',
    instructions: 'Create a one-to-one pair connection task: 2–6 concepts on the left and the same number of distinct partners on the right. Use safe lowercase IDs (e.g. l1, r1). Each card has only id and label (max 300 characters). Shuffle the right-hand cards so they do NOT already line up with the answers. answer is an array of right-card IDs in the SAME order as config.left. All partners must be used once. Suitable for vocabulary/definitions, formulas/interpretations, tools/purposes. Avoid ambiguous or interchangeable partners.',
    fields: { config: object({ left: array(card, 2, 6), right: array(card, 2, 6) }), answer: array(str, 2, 6) },
  },
  cloze: {
    name: 'word-bank-author',
    instructions: 'Create a word-bank puzzle with 2–6 blanks. config.segments contains the prose BEFORE, BETWEEN and AFTER the blanks (3–7 strings, max 400 chars each). Do not put placeholder underscores in the segments. config.options contains unique {id,label} tokens (at least as many as blanks, maximum 10). Include plausible distractors when appropriate. Each token can be used at most once. Shuffle the word bank; correct tokens must NOT appear in blank order. answer is the array of token IDs in blank order. Make exactly one unambiguous solution. Suitable for science explanations, grammar, vocabulary and reading pseudocode.',
    fields: { config: object({ segments: array({ ...str, description: 'Keep any Markdown, code or math expression self-contained within this segment; never split formatting across a blank.' }, 3, 7), options: array(card, 2, 10) }), answer: array(str, 2, 6) },
  },
  hotspots: {
    name: 'diagram-author',
    instructions: 'Create a diagram explorer using a directed concept map, NOT an image or anatomical illustration. config.nodes has 3–8 nodes, each {id,label,x,y}; labels max 100 chars, x between 10 and 90, y between 12 and 88 (percent coordinates). Space every pair at least 24 units horizontally OR 25 vertically. A grid using x=[15,50,85], y=[15,50,85] works. config.edges has 0–12 unique directed {from,to} node-ID edges. Explicitly explain what the arrows mean in questionText. The learner selects exactly pickCount nodes (at least 1 and fewer than all nodes). answer is the unordered list of the correct node IDs. Good for food webs, network roles, dependency maps, workflows, cause/effect and systems. Do not reveal correctness in labels, color metadata or IDs.',
    fields: { config: object({ nodes: array(object({ id: str, label: str, x: number, y: number }), 3, 8), edges: array(object({ from: str, to: str }), 0, 12), pickCount: integer }), answer: array(str, 1, 7) },
  },
  bughunt: {
    name: 'debugging-author',
    instructions: 'Create a code detective task: read displayed code and select the faulty line(s). No code is executed. config.language is the language name, config.lines is 3–18 raw single lines without Markdown fences (max 240 chars each), and pickCount is 1–4. Preserve indentation. answer is an unordered array of the 1-based faulty line numbers, length pickCount. State the intended behavior and enough constraints that the particular faulty line is unambiguous. Avoid bugs repairable by changing multiple alternative locations. Do not mark bugs in comments. Explain the corrected lines after submission. Suitable only for programming, SQL or code reasoning.',
    fields: { config: object({ language: str, lines: array(str, 3, 18), pickCount: integer }), answer: array(integer, 1, 4) },
  },
  numberline: {
    name: 'number-line-author',
    instructions: 'Create a calculation or estimation question answered by placing one marker on a number line. config has min,max,step,unit,tolerance. Bounds must be within +/-1000000 and min<max; use 2–1000 equal steps spanning the range exactly. Tolerance is nonnegative and smaller than one quarter of the range. answer is a private numeric target reachable as min+n*step. State the actual calculation or interpretation in questionText; do not disclose the computed answer. Useful for fractions, probability, signed arithmetic, temperature or unit conversion. This is one value, not a graph or arbitrary simulator. Explain the calculation after submission.',
    fields: { config: object({ min: number, max: number, step: { ...number, minimum: 0.000001 }, unit: str, tolerance: number }), answer: number },
  },
};

export const ACTIVITY_ROUTING = 'pairs = connect one-to-one partners (vocabulary, definitions, tools/purposes); cloze = complete 2–6 blanks from a shuffled word bank (language, scientific explanations); hotspots = select nodes in a directed concept map (food webs, networks, systems; no images/anatomy illustrations); bughunt = identify faulty lines in a displayed code snippet (programming/SQL; never executes code); numberline = place a numeric answer on a bounded scale (fractions, probability, arithmetic, conversions).';
