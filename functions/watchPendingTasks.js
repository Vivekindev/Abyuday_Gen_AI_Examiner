import amqp from "amqplib";
import generatedTests from "../models/generatedTests.js";
import geminiQueryRun, { createAgentGenerator } from "./geminiQueryRun.js";
import { generateInteractiveAssessment } from './assessment/orchestrator.js';
import { createEngineRegistry } from './assessment/engineRegistry.js';
import { EngineRequest } from '../models/assessmentEngine.js';
import pendingTasksDB from "../models/pendingTasksDB.js";
import Team from '../models/team.js';
import { DEFAULT_GEMINI_MODEL } from "../config/geminiModels.js";
import { recordActivity, workerHeartbeat } from "./telemetry.js";
import { generationFailure } from './assessment/generationErrors.js';
import { notifyGeneration } from './emailing/notifications.js';
import { difficultyRating } from '../shared/difficulty.js';

const QUEUE_NAME = "taskQueue";
const POLL_INTERVAL = 10000; // Poll every 10 seconds
const MAX_SERVICE_RETRIES = 12;
let polling = false;

const isTemporaryGeminiError = (error) =>
  [429, 500, 502, 503, 504].includes(error?.status);

const validQuestions = (questions, count) =>
  Array.isArray(questions) &&
  questions.length > 0 &&
  questions.length <= count &&
  questions.every(
    (question) =>
      typeof question.questionText === "string" &&
      question.questionText.trim() &&
      Array.isArray(question.options) &&
      question.options.length === 4 &&
      question.options.every(
        (option) => typeof option === "string" && option.trim(),
      ) &&
      new Set(question.options).size === 4 &&
      question.options.includes(question.answer) &&
      Array.isArray(question.tag),
  );

export const processTask = async (task) => {
  const attempt = task.generationAttempt || 0;
  const delayed = await pendingTasksDB.findOne({ testID: task.testID, status: 'Queued', nextAttemptAt: { $gt: new Date() } }).select('generationAttempt');
  if (delayed && (delayed.generationAttempt || 0) === attempt) return false;
  // Claim against the attempt and status atomically so queue-failure recovery cannot
  // race a worker into processing a failed or superseded delivery. Processing is
  // accepted for RabbitMQ redelivery after a worker disconnects.
  const pendingTask = await pendingTasksDB.findOneAndUpdate({
    testID: task.testID,
    status: { $in: ['queued', 'Queued', 'Processing'] },
    ...(attempt === 0 ? { $or: [{ generationAttempt: 0 }, { generationAttempt: { $exists: false } }] } : { generationAttempt: attempt }),
  }, { $set: { status: 'Processing' }, $unset: { generationError: 1, nextAttemptAt: 1 } }, { new: true }).select('+generationQuestions');
  if (!pendingTask) return true;
  if (pendingTask.team) {
    // Check after claiming Processing: deletion either sees the active worker,
    // or this worker sees the deletion lock before creating any content.
    const owningTeam = await Team.findById(pendingTask.team).select('deletingAt');
    if (!owningTeam || owningTeam.deletingAt) {
      await pendingTasksDB.updateOne({ _id: pendingTask._id, status: 'Processing' }, { $set: { status: 'Queued' } });
      return !owningTeam;
    }
  }
  const {
    testID,
    testName,
    testPrompt,
    questionCount,
    testDifficulty,
    testModel,
    user,
    team,
  } = pendingTask;
  console.log(`Processing Pending Task ${testID}`);
  try {
    // A redelivery after publication must not generate and charge for the same test again.
    if (await generatedTests.exists({ testID })) {
      pendingTask.status = 'Done';
      pendingTask.generationStage = 'ready';
      pendingTask.generationNotificationPending = true;
      await pendingTask.save();
      await notifyGeneration(pendingTask, true);
      return true;
    }
    const activeModel = pendingTask.testModel;
    await workerHeartbeat({
      workerStatus: "processing",
      currentTestID: testID,
    });
    await recordActivity({
      user: pendingTask.user,
      team: pendingTask.team,
      testID,
      action: "generation.started",
      source: "system",
    });
    let combinedResponse = [];
    let totalQuestionsCollected = 0;
    const maxRetries = 3;
    let generation;
    if (pendingTask.assessmentMode === 'interactive') {
      const result = await generateInteractiveAssessment({
        prompt: pendingTask.testPrompt, count: Number(pendingTask.questionCount), difficulty: difficultyRating(pendingTask.testDifficulty),
        generate: createAgentGenerator(activeModel, { user: pendingTask.user, team: pendingTask.team, testID }),
        registry: createEngineRegistry({ user: pendingTask.user, team: pendingTask.team, testID }),
        savedPlan: pendingTask.generationPlan,
        savedQuestions: pendingTask.generationQuestions,
        onQuestion: async (questions) => { pendingTask.generationQuestions = [...questions]; pendingTask.markModified('generationQuestions'); await pendingTask.save(); },
        onPlan: async (plan) => { pendingTask.generationPlan = plan; pendingTask.markModified('generationPlan'); await pendingTask.save(); },
        onProgress: async ({ stage }) => { pendingTask.generationStage = stage; await pendingTask.save(); },
      });
      combinedResponse = result.questions;
      totalQuestionsCollected = combinedResponse.length;
      generation = { version: 1, plan: result.plan, trace: result.trace };
    }

    while (totalQuestionsCollected < questionCount) {
      const currentBatchCount = Math.min(
        15,
        questionCount - totalQuestionsCollected,
      );
      console.log(
        `Processing with up to ${currentBatchCount} questions remaining.`,
      );

      let response;
      let parsedResponse;
      let retryCount = 0;

      while (retryCount < maxRetries) {
        try {
          response = await geminiQueryRun(
            testPrompt,
            currentBatchCount,
            difficultyRating(testDifficulty),
            activeModel,
            { user: pendingTask.user, team: pendingTask.team, testID },
          );

          parsedResponse = JSON.parse(response);
          if (!validQuestions(parsedResponse, currentBatchCount)) {
            throw new Error("Gemini returned invalid questions");
          }
          break; // exit the retry loop if parsing is successful
        } catch (jsonError) {
          if (isTemporaryGeminiError(jsonError)) throw jsonError;
          retryCount++;
          console.warn(
            `Retrying question generation (attempt ${retryCount}/${maxRetries}):`,
            jsonError,
          );
          if (retryCount >= maxRetries) {
            console.error(
              `Task ${testID} failed: Maximum retries reached for JSON parsing`,
            );
            pendingTask.status = "Error";
            pendingTask.generationNotificationPending = true;
            await pendingTask.save();
            await notifyGeneration(pendingTask, false);
            await recordActivity({
              user: pendingTask.user,
              team: pendingTask.team,
              testID,
              action: "generation.failed",
              source: "system",
            });
            return true;
          }
        }
      }

      combinedResponse = [...combinedResponse, ...parsedResponse];
      totalQuestionsCollected += parsedResponse.length;

      if (parsedResponse.length < currentBatchCount) {
        console.warn(
          `Batch returned only ${parsedResponse.length} questions. Missing ${questionCount - totalQuestionsCollected} more.`,
        );
      }
    }

    combinedResponse = combinedResponse.slice(0, questionCount);

    const newGeneratedTest = new generatedTests({
      testID,
      response: combinedResponse,
      generation,
      user,
      team: team || null,
    });
    await newGeneratedTest.save();

    console.log(`Done Processing Task ${testID}`);
    pendingTask.status = "Done";
    pendingTask.generationStage = 'ready';
    pendingTask.generationNotificationPending = true;
    pendingTask.generationError = undefined;
    pendingTask.generationQuestions = undefined;
    await pendingTask.save();
    await notifyGeneration(pendingTask, true);
    await recordActivity({
      user: pendingTask.user,
      team: pendingTask.team,
      testID,
      action: "generation.completed",
      source: "system",
    });
    await workerHeartbeat({ lastCompletedAt: new Date() });
    return true;
  } catch (error) {
    console.error(`Error processing task ${testID}:`, { ...generationFailure(error, pendingTask?.generationStage), httpStatus: error.status || null });
    if (pendingTask) {
      pendingTask.generationError = generationFailure(error, pendingTask.generationStage);
      if (
        isTemporaryGeminiError(error) &&
        (error.engineBusy || pendingTask.retryCount < MAX_SERVICE_RETRIES)
      ) {
        if (!error.engineBusy) pendingTask.retryCount += 1;
        if (
          !error.engineBusy &&
          error.status === 503 &&
          pendingTask.testModel === "gemini-3.8-flash" &&
          pendingTask.retryCount >= 3
        ) {
          pendingTask.testModel = DEFAULT_GEMINI_MODEL;
          console.warn(
            `Task ${testID}: Gemini 3.8 Flash is unavailable; retrying with ${DEFAULT_GEMINI_MODEL}`,
          );
        }
        pendingTask.status = "Queued";
        pendingTask.nextAttemptAt = new Date(Date.now() + (error.status === 429 ? 60000 : Math.min(60000, 10000 * 2 ** Math.min(pendingTask.retryCount, 3))));
        await pendingTask.save();
        await recordActivity({
          user: pendingTask.user,
          team: pendingTask.team,
          testID,
          action: "generation.requeued",
          source: "system",
        });
        return false;
      }
      pendingTask.status = "Error";
      pendingTask.generationNotificationPending = true;
      await pendingTask.save();
      await notifyGeneration(pendingTask, false);
      await EngineRequest.updateMany({ testID, user: pendingTask.user, status: 'requested' }, { $set: { status: 'failed', message: 'Assessment generation stopped before this request could be built. Retry this assessment to try again.' } });
      await recordActivity({
        user: pendingTask.user,
        team: pendingTask.team,
        testID,
        action: "generation.failed",
        source: "system",
      });
    }
    return true;
  }
};

// Function to poll RabbitMQ periodically for new tasks
const pollPendingTasks = async () => {
  if (polling) return;
  polling = true;
  let connection;
  let channel;
  try {
    // Connect to RabbitMQ
    connection = await amqp.connect(process.env.RABBITMQ_URL, {
      timeout: 5000,
    });
    channel = await connection.createChannel();

    // Assert the queue exists
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    await workerHeartbeat({
      lastPollAt: new Date(),
      workerStatus: "idle",
      currentTestID: null,
    });

    // Poll the queue
    const msg = await channel.get(QUEUE_NAME, { noAck: false });

    if (msg) {
      // Parse the task from the message
      const task = JSON.parse(msg.content.toString());

      // Process the task and check if it was successful
      const success = await processTask(task);

      if (success) {
        // Acknowledge the message only if the task was successfully processed
        channel.ack(msg);
      } else {
        channel.nack(msg, false, true);
      }
    }

    await workerHeartbeat({
      lastPollAt: new Date(),
      workerStatus: "idle",
      currentTestID: null,
    });
  } catch (error) {
    await workerHeartbeat({ workerStatus: "error", currentTestID: null });
    console.error("Error polling tasks from RabbitMQ:", error);
  } finally {
    await channel?.close().catch(() => {});
    await connection?.close().catch(() => {});
    polling = false;
  }
};

export const startTaskWorker = () => {
  pollPendingTasks();
  return setInterval(pollPendingTasks, POLL_INTERVAL);
};

export default startTaskWorker;
