import amqp from 'amqplib';

export async function publishAssessmentTask(task) {
  let connection;
  let channel;
  let timer;
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL, { timeout: 5000 });
    channel = await connection.createConfirmChannel();
    const publish = async () => {
      await channel.assertQueue('taskQueue', { durable: true });
      channel.sendToQueue('taskQueue', Buffer.from(JSON.stringify({ testID: task.testID, generationAttempt: task.generationAttempt || 0 })), { persistent: true });
      await channel.waitForConfirms();
    };
    await Promise.race([
      publish(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Queue confirmation timed out')), 10000); }),
    ]);
  } finally {
    clearTimeout(timer);
    // A close failure after confirmation must not turn a published job into a failed task.
    await channel?.close().catch(() => {});
    await connection?.close().catch(() => {});
  }
}
