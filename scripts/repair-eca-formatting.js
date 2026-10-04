// Targeted display-only repair for the reported published assessment. No model calls.
import 'dotenv/config';
import mongoose from 'mongoose';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Generated from '../models/generatedTests.js';
import { validateQuestion, gradeAnswer, simulateCircuit } from '../functions/assessment/engines.js';

const testID = 'ab26c0d66fb451f1';
try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000, autoIndex: false });
  const original = await Generated.findOne({ testID }).lean();
  if (!original) throw new Error('Reported assessment not found');
  const questions = structuredClone(original.response);
  const q = questions[1];
  if (q?.kind !== 'circuit') throw new Error('Reported question no longer has the expected circuit type');
  const state = { r1: 1000, r2: 4700, topology: 'parallel', closed: true };
  if (!gradeAnswer(q, state)) throw new Error('Repair example does not satisfy the existing grader');
  const measurement = simulateCircuit(q.config, state);
  if (q.questionText.includes('\\5')) {
    q.questionText = `Design a DC two-resistor circuit powered by a **${q.config.voltage} V** supply. Adjust the circuit to achieve a total supply current of **${q.config.targetCurrentMa} mA**, within **${q.config.toleranceMa} mA** of the target.\n\nChoose both resistor values from **${q.config.resistorChoices.join(', ')} ohms**, select series or parallel topology, and set the switch state. The initial configuration does not meet the target.`;
    q.explanation = `The target equivalent resistance is ${q.config.voltage} / ${q.config.targetCurrentMa / 1000} = ${(q.config.voltage / (q.config.targetCurrentMa / 1000)).toFixed(2)} ohms.\n\nChoose **1000 ohms and 4700 ohms in parallel**, with the switch closed. Their equivalent resistance is (1000 * 4700) / (1000 + 4700) = **${measurement.resistance.toFixed(2)} ohms**. The resulting supply current is **${measurement.currentMa.toFixed(3)} mA**, which lies within the allowed ${q.config.targetCurrentMa - q.config.toleranceMa} to ${q.config.targetCurrentMa + q.config.toleranceMa} mA range.`;
  }
  if (questions[6]?.explanation) questions[6].explanation = questions[6].explanation.replace(/\\n(?=[\\\sA-Z]|$)/g, '\n');
  if (questions[9]?.explanation) questions[9].explanation = questions[9].explanation.replace(String.raw`\text{seconds\)`, String.raw`\text{seconds}\)`);
  questions.forEach(validateQuestion);
  const filter = { _id: original._id };
  const changes = {};
  const backup = {};
  for (const [index, question] of questions.entries()) {
    for (const field of ['questionText', 'explanation']) {
      if (question[field] === original.response[index][field]) continue;
      const key = `response.${index}.${field}`;
      filter[key] = original.response[index][field];
      backup[key] = original.response[index][field];
      changes[key] = question[field];
    }
    // Assert that options, answers, configuration and all other task data stay identical.
    const rest = ({ questionText, explanation, ...value }) => value;
    if (JSON.stringify(rest(question)) !== JSON.stringify(rest(original.response[index]))) throw new Error('Unexpected change outside display text');
  }
  if (Object.keys(changes).length) {
    const backupPath = path.join(tmpdir(), `eca-formatting-${Date.now()}.json`);
    await writeFile(backupPath, JSON.stringify({ testID, before: backup, after: changes }, null, 2));
    const result = await Generated.updateOne(filter, { $set: changes });
    if (result.modifiedCount !== 1) throw new Error('Assessment changed concurrently; no repair applied');
    console.log(JSON.stringify({ testID, repairedFields: Object.keys(changes), backupPath }));
  } else console.log(JSON.stringify({ testID, repairedFields: [], alreadyRepaired: true }));
} finally { await mongoose.disconnect(); }
