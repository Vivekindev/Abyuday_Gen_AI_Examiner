import amqp from "amqplib";
import generatedTests from "../models/generatedTests.js";
import geminiQueryRun from "./geminiQueryRun.js";
import pendingTasksDB from "../models/pendingTasksDB.js";
import { DEFAULT_GEMINI_MODEL } from "../config/geminiModels.js";
import { recordActivity, workerHeartbeat } from "./telemetry.js";

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

const processTask = async (task) => {
  const {
    testID,
    testName,
    testPrompt,
    questionCount,
    testDifficulty,
    testModel,
    user,
    team,
  } = task;
  console.log(`Processing Pending Task ${testID}`);
  const pendingTask = await pendingTasksDB.findOne({ testID });
  try {
    if (!pendingTask) throw new Error("Pending task was not found");
    pendingTask.status = "Processing";
    await pendingTask.save();
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
            testDifficulty,
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
            await pendingTask.save();
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
      user,
      team: team || null,
    });
    await newGeneratedTest.save();

    console.log(`Done Processing Task ${testID}`);
    pendingTask.status = "Done";
    await pendingTask.save();
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
    console.error(`Error processing task ${testID}:`, error);
    if (pendingTask) {
      if (
        isTemporaryGeminiError(error) &&
        pendingTask.retryCount < MAX_SERVICE_RETRIES
      ) {
        pendingTask.retryCount += 1;
        if (
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
      await pendingTask.save();
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
