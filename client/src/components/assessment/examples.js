// Hand-authored practice examples only. Live assessment solutions are never bundled in the client.
export const interactionExamples = [
  {
    kind: 'circuit', questionText: 'Build a circuit that draws 10 mA from a 5 V supply.', tag: ['electronics', 'Ohm’s law'],
    config: { voltage: 5, resistorChoices: [250, 500, 1000, 2000], targetCurrentMa: 10, toleranceMa: 0.05, initial: { r1: 1000, r2: 1000, topology: 'series', closed: true } },
    explanation: 'A 5 V supply delivering 10 mA needs 500 Ω equivalent resistance. Two 1000 Ω resistors in parallel give (1000 × 1000) / (1000 + 1000) = 500 Ω. Close the switch. Two 250 Ω resistors in series also meet the target.',
  },
  {
    kind: 'graph', questionText: 'Tune a linear model to pass through the three measured points.', tag: ['algebra', 'linear models'],
    config: { points: [{ x: -2, y: -3 }, { x: 0, y: 1 }, { x: 3, y: 7 }], tolerance: 0.05, initial: { slope: 0, intercept: 0 } },
    explanation: 'The point (0, 1) fixes the intercept at 1. Between (0, 1) and (3, 7), y rises by 6 as x rises by 3, so the slope is 2. The line y = 2x + 1 passes through all three points.',
  },
  {
    kind: 'ordering', questionText: 'Arrange these steps in the JavaScript fetch workflow, from sending the request to displaying its data.', tag: ['JavaScript', 'async programming'],
    config: { items: [{ id: 'i3', label: 'Parse the successful response body as JSON.' }, { id: 'i1', label: 'Send the HTTP request with fetch and await the response.' }, { id: 'i4', label: 'Render the parsed data in the page.' }, { id: 'i2', label: 'Check the response status and reject unsuccessful responses.' }] },
    answer: ['i1', 'i2', 'i3', 'i4'], explanation: 'First await the response, then check its HTTP status. Parse the body of a successful response and render the resulting data. fetch does not reject solely because the server returns an HTTP error status.',
  },
  {
    kind: 'matching', questionText: 'Classify the following cell structures by their primary function.', tag: ['biology', 'cell structures'],
    config: { items: [{ id: 'i1', label: 'Ribosome' }, { id: 'i2', label: 'Mitochondrion' }, { id: 'i3', label: 'Nucleus' }, { id: 'i4', label: 'Nucleolus' }], categories: [{ id: 'i1', label: 'Protein synthesis machinery' }, { id: 'i2', label: 'Energy conversion' }, { id: 'i3', label: 'Genetic information storage' }] },
    answer: { i1: 'i1', i2: 'i2', i3: 'i3', i4: 'i1' }, explanation: 'Ribosomes synthesize proteins; the nucleolus produces rRNA and assembles ribosomal subunits. Mitochondria convert chemical energy into ATP. The nucleus stores most of the cell’s genetic information.',
  },
];
