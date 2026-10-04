// Explicit operational recovery: retries only the named failed assessments.
import 'dotenv/config';
import mongoose from 'mongoose';
import Task from '../models/pendingTasksDB.js';
import Generated from '../models/generatedTests.js';
import { processTask } from '../functions/watchPendingTasks.js';
import { publishAssessmentTask } from '../functions/taskQueue.js';
import { flushTelemetry, recordActivity } from '../functions/telemetry.js';

const ids = process.argv.slice(2).filter((arg) => arg !== '--live');
if (!process.argv.includes('--live') || !ids.length || ids.some((id) => !/^[a-zA-Z0-9_-]{1,64}$/.test(id))) {
  throw new Error('Usage: node scripts/retry-assessment-generation.js --live TEST_ID [...TEST_ID]. This consumes Gemini quota.');
}
try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  for (const testID of ids) {
    if (await Generated.exists({ testID })) { console.log(JSON.stringify({ testID, skipped: 'Already published' })); continue; }
    const task = await Task.findOneAndUpdate({ testID, status: 'Error' }, { $set: { status: 'Queued', retryCount: 0, generationStage: 'queued' }, $inc: { generationAttempt: 1 } }, { new: true });
    if (!task) { console.log(JSON.stringify({ testID, skipped: 'Not failed or not found' })); continue; }
    await recordActivity({ user: task.user, team: task.team, testID, action: 'assessment.retried', source: 'system' });
    const complete = await processTask({ testID, generationAttempt: task.generationAttempt });
    if (!complete) await publishAssessmentTask(task);
    const result = await Task.findOne({ testID }).select('status generationStage generationError +generationQuestions').lean();
    console.log(JSON.stringify({ testID, status: result.status, stage: result.generationStage, savedQuestions: result.generationQuestions?.filter(Boolean).length || 0, error: result.generationError }));
    if (result.status !== 'Done') process.exitCode = 1;
  }
} finally { await flushTelemetry(); await mongoose.disconnect(); }
