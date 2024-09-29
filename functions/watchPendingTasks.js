import amqp from 'amqplib';
import generatedTests from '../models/generatedTests.js';
import geminiQueryRun from './geminiQueryRun.js';
import pendingTasksDB from '../models/pendingTasksDB.js';

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const QUEUE_NAME = 'taskQueue';

const processTask = async (task) => {
  const { testID, testName, testPrompt, questionCount, testDifficulty, testModel, user } = task;
  console.log(`Processing Pending Task ${testID}`);
  const pendingTask = await pendingTasksDB.findOne({ testID });
  pendingTask.status = "Processing";
  await pendingTask.save();

  try {
    let combinedResponse = [];
    let totalQuestionsCollected = 0;
    const maxRetries = 3;

    while (totalQuestionsCollected < questionCount) {
      const currentBatchCount = Math.min(15, questionCount - totalQuestionsCollected);
      console.log(`Processing with up to ${currentBatchCount} questions remaining.`);

      let response;
      let parsedResponse;
      let retryCount = 0;

      while (retryCount < maxRetries) {
        try {
          response = await geminiQueryRun(testPrompt, currentBatchCount, testDifficulty, testModel);

          if (typeof response === 'string' && (response === '403' || response === '404')) {
            console.error(`Task ${testID} failed: Received error code ${response}`);
            pendingTask.status = "Error";
            await pendingTask.save();
            return false;
          }

          parsedResponse = JSON.parse(response);
          break; // exit the retry loop if parsing is successful

        } catch (jsonError) {
          retryCount++;
          console.warn(`Retrying due to JSON parse error (attempt ${retryCount}/${maxRetries}). Error:`, jsonError);
          if (retryCount >= maxRetries) {
            console.error(`Task ${testID} failed: Maximum retries reached for JSON parsing`);
            pendingTask.status = "Error";
            await pendingTask.save();
            return false;
          }
        }
      }

      combinedResponse = [...combinedResponse, ...parsedResponse];
      totalQuestionsCollected += parsedResponse.length;

      if (parsedResponse.length < currentBatchCount) {
        console.warn(`Batch returned only ${parsedResponse.length} questions. Missing ${questionCount - totalQuestionsCollected} more.`);
      }
    }

    combinedResponse = combinedResponse.slice(0, questionCount);

    const newGeneratedTest = new generatedTests({
      testID,
      response: combinedResponse,
      user,
    });
    await newGeneratedTest.save();

    console.log(`Done Processing Task ${testID}`);
    pendingTask.status = "Done";
    await pendingTask.save();
    return true;
  } catch (error) {
    console.error(`Error processing task ${testID}:`, error);
    return false;
  }
};


// Function to start consuming messages from RabbitMQ
const watchPendingTasks = async () => {
  try {
    // Connect to RabbitMQ
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    // Assert the queue exists
    await channel.assertQueue(QUEUE_NAME);

    console.log('Waiting for Pending Tasks in the queue...');

    // Consume messages from the queue
    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg !== null) {
        // Parse the task from the message
        const task = JSON.parse(msg.content.toString());

        // Process the task and check if it was successful
        const success = await processTask(task);

        if (success) {
          // Acknowledge the message only if the task was successfully processed
          channel.ack(msg);
        } else {
          // Do not acknowledge the message, so it remains in the queue for re-delivery
          console.log(`Task ${task.testID} will be retried.`);
        }
      }
    });
  } catch (error) {
    console.error('Error consuming tasks from RabbitMQ:', error);
  }
};

// Start consuming tasks from the queue
export default watchPendingTasks;