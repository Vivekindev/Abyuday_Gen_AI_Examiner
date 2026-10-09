import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import amqp from 'amqplib';

process.env.MONGODB_URI = `mongodb://127.0.0.1:27017/abyuday_test_mail_${Date.now()}_${process.pid}`;
process.env.ACCESS_TOKEN_SECRET = 'mail-test-access-secret';
process.env.REFRESH_TOKEN_SECRET = 'mail-test-refresh-secret';
process.env.TEST_TOKEN_SECRET = 'mail-test-exam-secret';
process.env.EMAIL_ENCRYPTION_KEY = 'mail-test-encryption-secret';
process.env.EMAIL_ENABLED = 'false';
process.env.APP_URL = 'https://app.example.test';
process.env.SMTP_USER = 'sender@example.test';
process.env.SMTP_PASS = 'test-only-not-a-real-password';
process.env.SMTP_FROM = 'Abyuday <sender@example.test>';

const { default: app } = await import('../index.js');
const { default: Users } = await import('../models/usersData.js');
const { default: Team } = await import('../models/team.js');
const { default: Task } = await import('../models/pendingTasksDB.js');
const { default: Generated } = await import('../models/generatedTests.js');
const { default: Outbox } = await import('../models/emailOutbox.js');
const { default: Requests } = await import('../models/teamAssessmentRequest.js');
const { notifyGeneration, queueEmail } = await import('../functions/emailing/notifications.js');
const { deliverNextEmail } = await import('../functions/emailing/worker.js');
const { processTask } = await import('../functions/watchPendingTasks.js');
const { flushTelemetry } = await import('../functions/telemetry.js');

test('difficulty and email events preserve access, privacy, retries, and preferences', async (t) => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await Outbox.init();
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await flushTelemetry();
    assert.match(mongoose.connection.name, /^abyuday_test_mail_/);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const request = async (path, method = 'GET', body, cookie = '') => {
    const response = await fetch(base + path, { method, headers: { Cookie: cookie, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const raw = await response.text();
    return { status: response.status, data: response.headers.get('content-type')?.includes('application/json') ? JSON.parse(raw) : raw, cookie: response.headers.getSetCookie().map((item) => item.split(';')[0]).join('; ') };
  };
  const people = {};
  for (const role of ['owner', 'admin', 'member', 'outsider']) {
    const registered = await request('/register', 'POST', { username: role, email: `${role}@example.test`, password: 'StrongPassword123!' });
    assert.equal(registered.status, 201);
    people[role] = { cookie: registered.cookie, user: await Users.findOne({ email: `${role}@example.test` }) };
  }
  const team = await Team.create({ name: 'Mail team', members: ['owner', 'admin', 'member'].map((role) => ({ user: people[role].user._id, role })) });
  const sent = [];
  const sender = { sendMail: async (mail) => { sent.push(mail); return { messageId: mail.messageId }; } };
  const drain = async () => { for (let count = 0; count < 30; count++) if (!await deliverNextEmail(sender)) return; throw new Error('Mail queue did not drain.'); };
  t.mock.method(amqp, 'connect', async () => ({ createConfirmChannel: async () => ({ assertQueue: async () => {}, sendToQueue: () => {}, waitForConfirms: async () => {}, close: async () => {} }), close: async () => {} }));

  await t.test('creation accepts named difficulty and legacy ratings without silent coercion', async () => {
    for (const [difficulty, expected] of [['easy', 2], ['Medium', 5], ['hard', 8], [0, 0], [10, 10]]) {
      const created = await request('/test/create', 'POST', { testName: `Difficulty ${difficulty}`, prompt: 'JavaScript fundamentals', numQuestions: 2, difficulty, assessmentMode: 'mcq' }, people.owner.cookie);
      assert.equal(created.status, 201);
      assert.equal(Number(created.data.task.testDifficulty), expected);
      const info = await request('/test/getinfo', 'POST', { testID: created.data.task.testID }, people.owner.cookie);
      assert.equal(info.data.difficulty, expected >= 7 ? 'Hard' : expected >= 4 ? 'Medium' : 'Easy');
    }
    for (const difficulty of [null, '', 'expert', -1, 11, 2.5, {}]) assert.equal((await request('/test/create', 'POST', { testName: 'Invalid difficulty', prompt: 'JavaScript fundamentals', numQuestions: 1, difficulty }, people.owner.cookie)).status, 400);
  });

  await t.test('invites encrypt tokens, use the real join route, and show delivery status', async () => {
    const created = await request(`/teams/${team.id}/invites`, 'POST', { email: 'new-person@example.test' }, people.owner.cookie);
    assert.equal(created.status, 201);
    const mail = await Outbox.findOne({ email: 'new-person@example.test' }).select('+payload');
    assert.ok(!JSON.stringify(mail.payload).includes(created.data.token));
    assert.equal((await Outbox.findById(mail.id).lean()).payload, undefined);
    const initial = await request(`/teams/${team.id}/invites`, 'GET', undefined, people.owner.cookie);
    assert.equal(initial.data[0].emailStatus, 'disabled');
    assert.ok(!JSON.stringify(initial.data).includes(created.data.token));
    await drain();
    assert.ok(sent.at(-1).text.includes(`/join?token=${created.data.token}`));
    assert.equal(sent.at(-1).to, 'new-person@example.test');
    assert.equal(sent.at(-1).cc, undefined);
    assert.equal((await request(`/teams/${team.id}/invites`, 'GET', undefined, people.owner.cookie)).data[0].emailStatus, 'sent');
    assert.equal((await Outbox.findById(mail.id).select('+payload')).payload, undefined);
    assert.equal((await request(`/teams/${team.id}/invites`, 'POST', { email: 'blocked@example.test' }, people.member.cookie)).status, 403);
    await request(`/teams/${team.id}/invites`, 'POST', { email: 'revoked@example.test' }, people.owner.cookie);
    const pending = await Outbox.findOne({ email: 'revoked@example.test' });
    await request(`/teams/${team.id}/invites/${pending.invite}`, 'DELETE', undefined, people.owner.cookie);
    assert.equal((await Outbox.findById(pending.id)).status, 'cancelled');
    const before = sent.length;
    await drain();
    assert.equal(sent.length, before);
  });

  await t.test('ready notifications recover publication and deduplicate per recipient and attempt', async () => {
    const task = await Task.create({ testID: 'email-ready-test', testName: 'Ready test', testPrompt: 'A detailed topic', questionCount: 1, testDifficulty: 5, testModel: 'gemini-3.5-flash-lite', user: people.owner.user._id, team: team._id, status: 'Queued' });
    await Generated.create({ testID: task.testID, user: people.owner.user._id, team: team._id, response: [{ questionText: '2+2?', options: ['1', '2', '3', '4'], answer: '4', tag: [] }] });
    assert.equal(await processTask({ testID: task.testID }), true);
    const ready = await Task.findById(task.id);
    assert.equal(ready.status, 'Done');
    assert.equal(ready.generationNotificationPending, false);
    await notifyGeneration(ready, true);
    assert.equal(await Outbox.countDocuments({ testID: task.testID }), 3);
    await drain();
    assert.deepEqual(sent.slice(-3).map((mail) => mail.to).sort(), ['admin@example.test', 'member@example.test', 'owner@example.test']);
    await Task.updateOne({ _id: task._id }, { $set: { status: 'Error', generationAttempt: 1 } });
    await notifyGeneration(await Task.findById(task.id), false);
    const failed = await Outbox.find({ testID: task.testID, event: 'generation.failed' });
    assert.deepEqual(failed.map((mail) => mail.email).sort(), ['admin@example.test', 'owner@example.test']);
    await drain();
  });

  await t.test('requests notify current admins, and updates notify the requester', async () => {
    const created = await request(`/teams/${team.id}/assessment-requests`, 'POST', { title: 'Requested test', topic: 'Detailed JavaScript topics', questionCount: 3, difficulty: 'hard' }, people.member.cookie);
    assert.equal(created.status, 201);
    assert.equal((await Requests.findById(created.data.id)).difficulty, 8);
    const queued = await Outbox.find({ event: 'assessment.requested' });
    assert.deepEqual(queued.map((mail) => mail.email).sort(), ['admin@example.test', 'owner@example.test']);
    await drain();
    const changed = await request(`/teams/${team.id}/assessment-requests/${created.data.id}`, 'PATCH', { status: 'in_progress' }, people.owner.cookie);
    assert.equal(changed.status, 200);
    await drain();
    assert.equal(sent.at(-1).to, 'member@example.test');
    assert.ok(sent.at(-1).subject.includes('accepted'));
    assert.equal((await request(`/teams/${team.id}/assessment-requests/${created.data.id}`, 'PATCH', { status: 'fulfilled' }, people.outsider.cookie)).status, 404);
  });

  await t.test('delivery leases prevent concurrent claims and transient errors retry', async () => {
    await queueEmail({ key: 'retry-message', event: 'team.update', category: 'team', email: people.admin.user.email, user: people.admin.user._id, team: team._id, payload: { title: 'Retry notice', message: 'Important team update' } });
    let attempts = 0;
    const failingSender = { sendMail: async () => { attempts++; throw Object.assign(new Error('No network'), { code: 'ETIMEDOUT' }); } };
    await Promise.all([deliverNextEmail(failingSender), deliverNextEmail(failingSender)]);
    assert.equal(attempts, 1);
    const mail = await Outbox.findOne({ event: 'team.update' });
    assert.equal(mail.status, 'pending');
    assert.ok(mail.nextAttemptAt.getTime() > Date.now());
    await Outbox.updateOne({ _id: mail._id }, { $set: { nextAttemptAt: new Date(0) } });
    await drain();
    const delivered = await Outbox.findById(mail.id);
    assert.equal(delivered.status, 'sent');
    assert.equal(delivered.attempts, 2);
  });

  await t.test('admin alerts recheck roles at delivery and exhausted retries become visible failures', async () => {
    await queueEmail({ key: 'admin-only-message', event: 'team.admin_only', category: 'team', email: people.admin.user.email, user: people.admin.user._id, team: team._id, requiredRoles: ['owner', 'admin'], payload: { title: 'Admin notice', message: 'Review team requests' } });
    await Team.updateOne({ _id: team._id, 'members.user': people.admin.user._id }, { $set: { 'members.$.role': 'member' } });
    const before = sent.length;
    await drain();
    assert.equal(sent.length, before);
    assert.equal((await Outbox.findOne({ event: 'team.admin_only' })).status, 'cancelled');
    await Team.updateOne({ _id: team._id, 'members.user': people.admin.user._id }, { $set: { 'members.$.role': 'admin' } });
    await queueEmail({ key: 'exhausted-message', event: 'team.exhausted', category: 'team', email: people.admin.user.email, user: people.admin.user._id, payload: { title: 'Delivery failure', message: 'A retryable notice' } });
    await Outbox.updateOne({ event: 'team.exhausted' }, { $set: { attempts: 5 } });
    await deliverNextEmail({ sendMail: async () => { throw Object.assign(new Error('Authentication failed'), { code: 'EAUTH' }); } });
    const exhausted = await Outbox.findOne({ event: 'team.exhausted' });
    assert.equal(exhausted.status, 'failed');
    assert.equal(exhausted.lastError, 'EAUTH');
  });

  await t.test('preferences cancel pending optional mail and preserve invitations and security mail', async () => {
    await queueEmail({ key: 'optional-message', event: 'team.optional', category: 'team', email: people.member.user.email, user: people.member.user._id, team: team._id, payload: { title: 'Optional notice', message: 'Team update' } });
    assert.equal((await request('/me/email-preferences', 'PATCH', { generation: false, team: false }, people.member.cookie)).status, 200);
    assert.equal((await request('/me/email-preferences', 'PATCH', { generation: 'false', team: false }, people.member.cookie)).status, 400);
    assert.equal((await request('/me/email-preferences', 'GET', undefined, people.owner.cookie)).data.team, true);
    const before = sent.length;
    await drain();
    assert.equal(sent.length, before);
    assert.equal((await Outbox.findOne({ event: 'team.optional' })).status, 'cancelled');
    await queueEmail({ key: 'security-message', event: 'security.test', category: 'security', email: people.member.user.email, user: people.member.user._id, payload: { title: 'Security notice', message: 'Account security update' } });
    await drain();
    assert.equal(sent.at(-1).to, 'member@example.test');
    assert.equal((await request('/me/email-preferences', 'PATCH', { generation: true, team: true }, people.member.cookie)).status, 200);
  });

  await t.test('role changes and removals notify affected people without leaking to outsiders', async () => {
    await request(`/teams/${team.id}/members/${people.member.user.id}`, 'PATCH', { role: 'admin' }, people.owner.cookie);
    await drain();
    assert.equal(sent.at(-1).to, 'member@example.test');
    assert.ok(sent.at(-1).subject.includes('role changed'));
    await request(`/teams/${team.id}/members/${people.member.user.id}`, 'DELETE', undefined, people.owner.cookie);
    await drain();
    assert.deepEqual(sent.slice(-2).map((mail) => mail.to).sort(), ['admin@example.test', 'member@example.test']);
    assert.ok(sent.at(-1).subject.includes('removed'));
    assert.ok(!sent.some((mail) => mail.to === 'outsider@example.test'));
  });

  await t.test('team deletion cancels queued mail and notifies remaining members', async () => {
    await queueEmail({ key: 'deleted-team-pending', event: 'team.pending', category: 'team', email: people.admin.user.email, user: people.admin.user._id, team: team._id, payload: { title: 'Stale team notice', message: 'No longer relevant' } });
    const removed = await request(`/teams/${team.id}`, 'DELETE', { confirmationName: team.name }, people.owner.cookie);
    assert.equal(removed.status, 204);
    assert.equal((await Outbox.findOne({ event: 'team.pending' })).status, 'cancelled');
    await drain();
    assert.equal(sent.at(-1).to, 'admin@example.test');
    assert.ok(sent.at(-1).subject.includes('Team deleted'));
  });
});
