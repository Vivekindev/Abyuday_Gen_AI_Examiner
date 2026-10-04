import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import amqp from 'amqplib';

process.env.MONGODB_URI = `mongodb://127.0.0.1:27017/abyuday_test_retry_${Date.now()}`;
process.env.ACCESS_TOKEN_SECRET = 'retry-test-access-secret';
process.env.REFRESH_TOKEN_SECRET = 'retry-test-refresh-secret';
process.env.TEST_TOKEN_SECRET = 'retry-test-exam-secret';
const { default: app } = await import('../index.js');
const { default: Task } = await import('../models/pendingTasksDB.js');
const { default: Generated } = await import('../models/generatedTests.js');
const { default: User } = await import('../models/usersData.js');
const { default: Team } = await import('../models/team.js');
const { Activity } = await import('../models/telemetry.js');
const { flushTelemetry } = await import('../functions/telemetry.js');
const { processTask } = await import('../functions/watchPendingTasks.js');
const { EngineRequest } = await import('../models/assessmentEngine.js');
const { createEngineRegistry } = await import('../functions/assessment/engineRegistry.js');
const { energyObjective, energyQuestion } = await import('./fixtures/dynamic.js');

test('failed assessments retry with authorization, one queued job, and recoverable queue errors', async (t) => {
  await mongoose.connect(process.env.MONGODB_URI);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await flushTelemetry();
    assert.match(mongoose.connection.name, /^abyuday_test_retry_/);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function post(path, body, cookie = '') {
    const res = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(body) });
    const raw = await res.text();
    return { status: res.status, data: res.headers.get('content-type')?.includes('application/json') ? JSON.parse(raw) : raw, cookie: res.headers.getSetCookie().map((item) => item.split(';')[0]).join('; ') };
  }
  const owner = await post('/register', { username: 'Retry owner', email: 'retry-owner@example.test', password: 'StrongPassword123!' });
  const other = await post('/register', { username: 'Retry member', email: 'retry-other@example.test', password: 'StrongPassword123!' });
  assert.equal(owner.status, 201); assert.equal(other.status, 201);
  const user = await User.findOne({ email: 'retry-owner@example.test' });
  const otherUser = await User.findOne({ email: 'retry-other@example.test' });
  const plan = { questions: [energyObjective] };
  const taskData = { testName: 'Retry lab', testPrompt: 'Energy workbench', questionCount: '1', testDifficulty: '5', testModel: 'gemini-3.5-flash-lite', user: user._id, status: 'Error', assessmentMode: 'interactive', retryCount: 12, generationStage: 'engine-builder', generationPlan: plan };
  const published = [];
  let failQueue = false;
  let failClose = false;
  let workerReceived = false;
  t.mock.method(amqp, 'connect', async () => {
    if (failQueue) throw new Error('Queue unavailable');
    return {
      createConfirmChannel: async () => ({
        assertQueue: async (name) => assert.equal(name, 'taskQueue'),
        sendToQueue: (name, message, options) => { assert.equal(name, 'taskQueue'); assert.equal(options.persistent, true); published.push(JSON.parse(message.toString())); },
        waitForConfirms: async () => {
          if (workerReceived) {
            await Task.updateOne({ testID: published.at(-1).testID }, { $set: { status: 'Processing' } });
            throw new Error('Confirmation lost after worker received the task');
          }
        },
        close: async () => { if (failClose) throw new Error('Close failed after confirmation'); },
      }),
      close: async () => {},
    };
  });
  const retry = (testID, cookie = owner.cookie) => post('/test/retry', { testID }, cookie);
  await Task.create({ ...taskData, testID: 'failed' });
  await Task.updateOne({ testID: 'failed' }, { $set: { generationQuestions: [energyQuestion], generationError: { stage: 'engine-builder', message: 'Test validation error' } } });
  assert.equal((await Task.findOne({ testID: 'failed' }).lean()).generationQuestions, undefined);
  // Existing failed records without the newly introduced attempt field remain retryable.
  await Task.collection.updateOne({ testID: 'failed' }, { $unset: { generationAttempt: '' } });
  assert.equal((await retry('failed', '')).status, 401);
  assert.equal((await retry({ $ne: null })).status, 400);
  assert.equal((await retry('missing')).status, 404);
  assert.equal((await retry('failed', other.cookie)).status, 403);
  assert.equal((await post('/test/getinfo', { testID: 'failed' }, owner.cookie)).data.canRetry, true);
  assert.equal((await post('/test/getinfo', { testID: 'failed' }, other.cookie)).data.canRetry, false);
  const privateInfo = (await post('/test/getinfo', { testID: 'failed' }, other.cookie)).data;
  assert.equal(privateInfo.generationQuestions, undefined); assert.equal(privateInfo.generationError, undefined);
  assert.equal((await post('/fetchcreatedtests', {}, owner.cookie)).data.find((item) => item.testID === 'failed').canRetry, true);
  const parallel = await Promise.all([retry('failed'), retry('failed')]);
  assert.deepEqual(parallel.map((res) => res.status).sort(), [202, 409]);
  assert.deepEqual(published, [{ testID: 'failed', generationAttempt: 1 }]);
  const queued = await Task.findOne({ testID: 'failed' }).lean();
  assert.equal(queued.status, 'Queued'); assert.equal(queued.retryCount, 0); assert.equal(queued.generationStage, 'queued');
  assert.deepEqual(queued.generationPlan, plan); assert.equal(queued.testModel, taskData.testModel);
  assert.deepEqual((await Task.findOne({ testID: 'failed' }).select('+generationQuestions').lean()).generationQuestions, [energyQuestion]);
  assert.equal(await Task.countDocuments({ testID: 'failed' }), 1);
  assert.equal((await retry('failed')).status, 409);
  assert.equal((await post('/test/getinfo', { testID: 'failed' }, owner.cookie)).data.canRetry, false);
  for (const status of ['Done', 'Processing']) {
    await Task.create({ ...taskData, testID: status, status });
    assert.equal((await retry(status)).status, 409);
  }
  await Task.create({ ...taskData, testID: 'published' });
  await Generated.create({ testID: 'published', user: user._id, response: [{ questionText: '2+2?', options: ['1', '2', '3', '4'], answer: '4', tag: [] }] });
  assert.equal((await retry('published')).status, 409);
  assert.equal((await post('/test/getinfo', { testID: 'published' }, owner.cookie)).data.canRetry, false);

  await Task.create({ ...taskData, testID: 'queue-failure' });
  failQueue = true;
  assert.equal((await retry('queue-failure')).status, 503);
  assert.equal((await Task.findOne({ testID: 'queue-failure' })).status, 'Error');
  failQueue = false; failClose = true;
  assert.equal((await retry('queue-failure')).status, 202);
  assert.equal((await Task.findOne({ testID: 'queue-failure' })).status, 'Queued');
  assert.deepEqual(published.at(-1), { testID: 'queue-failure', generationAttempt: 2 });
  failClose = false;
  await Task.create({ ...taskData, testID: 'confirmation-lost' });
  workerReceived = true;
  assert.equal((await retry('confirmation-lost')).status, 202);
  assert.equal((await Task.findOne({ testID: 'confirmation-lost' })).status, 'Processing');
  workerReceived = false;

  const team = await Team.create({ name: 'Retry team', members: [{ user: user._id, role: 'owner' }, { user: otherUser._id, role: 'member' }] });
  await Task.create({ ...taskData, testID: 'team-failed', team: team._id });
  assert.equal((await retry('team-failed', other.cookie)).status, 403);
  assert.equal((await post('/fetchcreatedtests', {}, other.cookie)).data.find((item) => item.testID === 'team-failed').canRetry, false);
  await Team.updateOne({ _id: team._id, 'members.user': otherUser._id }, { $set: { 'members.$.role': 'admin' } });
  assert.equal((await post('/test/getinfo', { testID: 'team-failed' }, other.cookie)).data.canRetry, true);
  assert.equal((await retry('team-failed', other.cookie)).status, 202);
  await Task.create({ ...taskData, testID: 'removed-creator', team: team._id });
  await Team.updateOne({ _id: team._id }, { $pull: { members: { user: user._id } } });
  assert.equal((await retry('removed-creator')).status, 403);
  assert.equal((await post('/fetchcreatedtests', {}, owner.cookie)).data.find((item) => item.testID === 'removed-creator').canRetry, false);

  // A delayed delivery from an older run cannot mutate a newer run, even if questions exist.
  await Task.updateOne({ testID: 'published' }, { $set: { status: 'Queued', generationAttempt: 2 } });
  assert.equal(await processTask({ testID: 'published', generationAttempt: 1 }), true);
  assert.equal(await processTask({ testID: 'published' }), true);
  assert.equal((await Task.findOne({ testID: 'published' })).status, 'Queued');
  await Task.updateOne({ testID: 'published' }, { $set: { nextAttemptAt: new Date(Date.now() + 60000) } });
  assert.equal(await processTask({ testID: 'published', generationAttempt: 2 }), false);
  assert.equal((await Task.findOne({ testID: 'published' })).status, 'Queued');
  await Task.updateOne({ testID: 'published' }, { $unset: { nextAttemptAt: 1 } });
  assert.equal(await processTask({ testID: 'published', generationAttempt: 2 }), true);
  assert.equal((await Task.findOne({ testID: 'published' })).status, 'Done');
  await Task.updateOne({ testID: 'published' }, { $set: { status: 'Error' } });
  assert.equal(await processTask({ testID: 'published', generationAttempt: 2 }), true);
  assert.equal((await Task.findOne({ testID: 'published' })).status, 'Error');

  const registry = createEngineRegistry({ user: user._id, testID: 'failed' });
  await registry.recordRequests(plan.questions);
  await EngineRequest.updateOne({ testID: 'failed' }, { $set: { status: 'unsupported' } });
  await registry.recordRequests(plan.questions);
  assert.equal((await EngineRequest.findOne({ testID: 'failed' })).status, 'requested');
  await flushTelemetry();
  assert.equal(await Activity.countDocuments({ action: 'assessment.retried', testID: 'failed' }), 1);
});
