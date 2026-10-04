// Opt-in live smoke check. Uses a temporary local database, never the application database.
import 'dotenv/config';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { generateInteractiveAssessment } from '../functions/assessment/orchestrator.js';
import { createAgentGenerator } from '../functions/geminiQueryRun.js';
import { DEFAULT_GEMINI_MODEL } from '../config/geminiModels.js';
import { flushTelemetry } from '../functions/telemetry.js';
import { AiUsage } from '../models/telemetry.js';
import { createEngineRegistry } from '../functions/assessment/engineRegistry.js';
import { EngineRequest } from '../models/assessmentEngine.js';

if (!process.argv.includes('--live')) {
  console.log('Pass --live to make metered Gemini calls using your configured API key. Requires local MongoDB.');
} else if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not configured.');
  process.exitCode = 1;
} else {
  const dbName = `abyuday_smoke_${randomUUID().replaceAll('-', '')}`;
  try {
    await mongoose.connect(`mongodb://127.0.0.1:27017/${dbName}`, { serverSelectionTimeoutMS: 5000 });
    const dynamic = process.argv.includes('--dynamic');
    const context = { user: new mongoose.Types.ObjectId(), testID: 'interactive-smoke' };
    const registry = createEngineRegistry(context);
    const result = await generateInteractiveAssessment({
      prompt: dynamic ? 'Build a kinetic energy workbench with adjustable mass and speed controls and a live energy measurement E=0.5*m*v^2. Ask the student to adjust the controls to achieve a target energy. This needs a custom engine; do not substitute a multiple-choice, linear graph, ordering or matching task.' : 'Two hands-on tasks: one about changing an ideal DC series/parallel resistor circuit to achieve a target current, and one about adjusting a linear graph to pass through target points.',
      count: dynamic ? 1 : 2,
      difficulty: 5,
      generate: createAgentGenerator(DEFAULT_GEMINI_MODEL, context),
      registry: dynamic ? registry : undefined,
      onProgress: async ({ stage }) => console.log(`Stage: ${stage}`),
    });
    console.log(JSON.stringify({ validated: true, questions: result.questions.map((q) => ({ kind: q.kind, questionText: q.questionText, config: q.config })), agents: result.trace }, null, 2));
    if (dynamic) {
      if (result.questions[0]?.kind !== 'dynamic') throw new Error('Expected a dynamic engine task');
      await registry.resolve({ key: result.questions[0].config.engine.key, slot: 1, domain: 'physics', objective: 'Reuse smoke check', requirement: 'Reuse the registered engine', build: () => { throw new Error('Reuse unexpectedly built another engine'); } });
      console.log(JSON.stringify({ requests: await EngineRequest.find().select('key status -_id').lean() }));
    }
  } catch (error) {
    // Do not log provider response bodies or request objects, which can contain credentials.
    console.error(JSON.stringify({ validated: false, errorType: error.name, httpStatus: error.status || null }));
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await flushTelemetry();
      const calls = await AiUsage.find().select('operation agent status httpStatus totalTokens errorCode -_id').lean();
      console.log(JSON.stringify({ usage: calls }));
      if (mongoose.connection.name !== dbName || !dbName.startsWith('abyuday_smoke_')) throw new Error('Refusing to clean an unexpected database');
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  }
}
