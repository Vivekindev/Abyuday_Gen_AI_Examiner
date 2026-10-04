export const energyEngine = {
  key: 'kinetic-energy-lab', title: 'Kinetic energy workbench', description: 'An ideal classical kinetic energy model: E = 0.5 × mass × speed².', version: 1, minutes: 4,
  controls: [
    { id: 'mass', label: 'Mass', type: 'number', unit: 'kg', min: 1, max: 10, step: 1, initial: '1', options: [] },
    { id: 'speed', label: 'Speed', type: 'number', unit: 'm/s', min: 0, max: 20, step: 1, initial: '0', options: [] },
  ],
  metrics: [{ id: 'energy', label: 'Kinetic energy', unit: 'J', tokens: ['0.5', '$mass', 'mul', '$speed', '2', 'pow', 'mul'] }],
};
export const energyQuestion = {
  kind: 'dynamic', schemaVersion: 1, questionText: 'Set the system to 100 J of kinetic energy.', tag: ['physics'], explanation: 'Use mass 2 kg and speed 10 m/s: E = 0.5 × 2 × 10² = 100 J.',
  config: { engine: energyEngine, instructions: 'Adjust mass and speed until kinetic energy is 100 J, within 0.01 J.' },
  checks: [{ source: 'energy', expected: '100', tolerance: 0.01 }], answer: { mass: '2', speed: '10' },
};
export const energyObjective = { kind: 'dynamic', domain: 'physics', objective: 'Tune mass and speed to reach a target kinetic energy', engineKey: energyEngine.key, engineRequirement: 'Mass and speed sliders with a live kinetic energy readout in joules using E=0.5*m*v^2.' };
export const energyAuthorResponse = { questionText: energyQuestion.questionText, tag: energyQuestion.tag, explanation: energyQuestion.explanation, instructions: energyQuestion.config.instructions, checks: energyQuestion.checks, solution: Object.entries(energyQuestion.answer).map(([id, value]) => ({ id, value })) };
