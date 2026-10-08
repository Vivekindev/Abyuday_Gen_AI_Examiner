// Practice-only examples. Live assessment answers are never imported by the UI.
export const activityExamples = [
  {
    kind: 'pairs', tag: ['Biology', 'Cell structures'], questionText: 'Connect each cell structure to its primary job.',
    config: {
      left: [{ id: 'nucleus', label: 'Nucleus' }, { id: 'ribosome', label: 'Ribosome' }, { id: 'mitochondrion', label: 'Mitochondrion' }],
      right: [{ id: 'energy', label: 'Produces most ATP during aerobic respiration' }, { id: 'dna', label: 'Stores most of the cell’s DNA' }, { id: 'protein', label: 'Assembles proteins' }],
    },
    answer: ['dna', 'protein', 'energy'], explanation: 'The nucleus stores most DNA in a eukaryotic cell. Ribosomes translate messenger RNA into proteins. Mitochondria produce most ATP during aerobic respiration.',
  },
  {
    kind: 'cloze', tag: ['Science', 'Photosynthesis'], questionText: 'Complete the explanation of photosynthesis. One word is a distractor.',
    config: {
      segments: ['During photosynthesis, plants absorb ', ' from sunlight. They take in ', ' from the air and release ', ' as a by-product.'],
      options: [{ id: 'oxygen', label: 'oxygen' }, { id: 'nitrogen', label: 'nitrogen' }, { id: 'energy', label: 'energy' }, { id: 'carbon', label: 'carbon dioxide' }],
    },
    answer: ['energy', 'carbon', 'oxygen'], explanation: 'Photosynthesis uses light energy to make sugars from carbon dioxide and water. Oxygen is released as a by-product of splitting water.',
  },
  {
    kind: 'hotspots', tag: ['Biology', 'Food webs'], questionText: 'In this food web, an arrow points from food to the animal that eats it. Select the two organisms that eat plants directly.',
    config: {
      nodes: [{ id: 'grass', label: 'Grass', x: 15, y: 50 }, { id: 'rabbit', label: 'Rabbit', x: 50, y: 20 }, { id: 'grasshopper', label: 'Grasshopper', x: 50, y: 80 }, { id: 'hawk', label: 'Hawk', x: 85, y: 20 }, { id: 'frog', label: 'Frog', x: 85, y: 80 }],
      edges: [{ from: 'grass', to: 'rabbit' }, { from: 'grass', to: 'grasshopper' }, { from: 'rabbit', to: 'hawk' }, { from: 'grasshopper', to: 'frog' }, { from: 'frog', to: 'hawk' }], pickCount: 2,
    },
    answer: ['rabbit', 'grasshopper'], explanation: 'Follow the arrows leaving grass: they lead to rabbit and grasshopper. These are the primary consumers in this simplified food web. The frog and hawk eat other animals.',
  },
  {
    kind: 'bughunt', tag: ['Programming', 'JavaScript'], questionText: 'This function must add all prices, starting at zero. The parameter, loop, and return statement are correct. Find the line that prevents the total from accumulating.',
    config: { language: 'JavaScript', lines: ['function totalPrice(prices) {', '  let total = 0;', '  for (const price of prices) {', '    total = price;', '  }', '  return total;', '}'], pickCount: 1 },
    answer: [4], explanation: 'Line 4 replaces the total each time. Change it to `total += price;` to accumulate every price. For `[4, 6, 3]`, the corrected function returns 13 instead of 3.',
  },
  {
    kind: 'numberline', tag: ['Math', 'Probability'], questionText: 'A bag contains 3 blue counters and 5 orange counters. Place the probability of choosing a blue counter on the number line.',
    config: { min: 0, max: 1, step: 0.025, unit: '', tolerance: 0 }, answer: 0.375,
    explanation: 'There are 8 counters in total and 3 are blue. The probability is 3 ÷ 8 = 0.375. Probabilities range from 0 (impossible) to 1 (certain).',
  },
];
