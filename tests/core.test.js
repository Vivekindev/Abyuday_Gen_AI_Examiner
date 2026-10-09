import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

const databaseName = `abyuday_test_${Date.now()}_${Math.random().toString(16).slice(2)}`;
process.env.MONGODB_URI = `mongodb://127.0.0.1:27017/${databaseName}`;
process.env.ACCESS_TOKEN_SECRET = 'test-access-secret-long-enough';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-long-enough';
process.env.TEST_TOKEN_SECRET = 'test-exam-secret-long-enough';

const { default: app } = await import('../index.js');
const { default: generatedTests } = await import('../models/generatedTests.js');
const { default: pendingTasksDB } = await import('../models/pendingTasksDB.js');
const { default: usersData } = await import('../models/usersData.js');
const { flushTelemetry } = await import('../functions/telemetry.js');

let server;
let base;

const request = async (path, { method = 'GET', body, cookie } = {}) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, data: text && response.headers.get('content-type')?.includes('application/json') ? JSON.parse(text) : text, cookies: response.headers.getSetCookie?.() || [] };
};

const authCookie = (cookies) => cookies.filter((value) => /^(accessToken|refreshToken)=/.test(value))
  .map((value) => value.split(';')[0]).join('; ');

test('team access, invitation, and exam answers stay scoped', async (t) => {
  await mongoose.connect(process.env.MONGODB_URI);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await flushTelemetry();
    assert.match(mongoose.connection.name, /^abyuday_test_/);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  const owner = await request('/api/register', { method: 'POST', body: { username: 'Owner', email: 'owner@example.test', password: 'StrongPassword123!' } });
  assert.equal(owner.status, 201);
  const ownerCookie = authCookie(owner.cookies);
  const member = await request('/api/register', { method: 'POST', body: { username: 'Member', email: 'member@example.test', password: 'StrongPassword123!' } });
  assert.equal(member.status, 201);
  const memberCookie = authCookie(member.cookies);
  const outsider = await request('/api/register', { method: 'POST', body: { username: 'Outsider', email: 'outsider@example.test', password: 'StrongPassword123!' } });
  assert.equal(outsider.status, 201);
  const outsiderCookie = authCookie(outsider.cookies);

  const created = await request('/api/teams', { method: 'POST', cookie: ownerCookie, body: { name: 'Engineering' } });
  assert.equal(created.status, 201);
  const teamId = created.data.id;
  const invite = await request(`/api/teams/${teamId}/invites`, { method: 'POST', cookie: ownerCookie, body: { email: 'member@example.test', role: 'member' } });
  assert.equal(invite.status, 201);
  const accepted = await request(`/api/teams/invites/${invite.data.token}/accept`, { method: 'POST', cookie: memberCookie });
  assert.equal(accepted.status, 200);
  const forbiddenInvite = await request(`/api/teams/${teamId}/invites`, { method: 'POST', cookie: memberCookie, body: { email: 'other@example.test' } });
  assert.equal(forbiddenInvite.status, 403);
  const forbiddenCreation = await request('/api/test/create', { method: 'POST', cookie: memberCookie, body: {
    testName: 'Team test', prompt: 'A detailed topic', numQuestions: 1, difficulty: 5,
    selectedModel: 'gemini-3.5-flash-lite', teamId,
  } });
  assert.equal(forbiddenCreation.status, 403);

  const ownerUser = await usersData.findOne({ email: 'owner@example.test' });
  await pendingTasksDB.create({ testID: 'test-queued-1', testName: 'Upcoming test', testPrompt: 'A topic', questionCount: '5', testDifficulty: '5', testModel: 'gemini-3.5-flash-lite', status: 'Queued', user: ownerUser._id, team: teamId });
  const queuedList = await request('/api/fetchcreatedtests', { method: 'POST', cookie: memberCookie });
  assert.equal(queuedList.status, 200);
  assert.equal(queuedList.data.find((item) => item.testID === 'test-queued-1')?.status, 'Queued');
  await pendingTasksDB.create({ testID: 'test-core-1', testName: 'Core test', testPrompt: 'A topic', questionCount: '1', testDifficulty: '5', testModel: 'gemini-3.5-flash-lite', status: 'Done', user: ownerUser._id, team: teamId });
  await generatedTests.create({ testID: 'test-core-1', user: ownerUser._id, team: teamId, response: [{ questionText: '2 + 2?', options: ['3', '4', '5', '6'], answer: '4', tag: ['arithmetic'] }] });
  const outsiderAttempt = await request('/api/test/begin', { method: 'POST', cookie: outsiderCookie, body: { testID: 'test-core-1' } });
  assert.equal(outsiderAttempt.status, 403);
  const begun = await request('/api/test/begin', { method: 'POST', cookie: memberCookie, body: { testID: 'test-core-1' } });
  assert.equal(begun.status, 200);
  assert.equal(begun.data.testQuestions[0].answer, undefined);
  const activeAttempts = await request('/api/me/attempts', { cookie: memberCookie });
  assert.equal(activeAttempts.status, 200);
  assert.equal(activeAttempts.data[0].testName, 'Core test');
  assert.equal(activeAttempts.data[0].results, null);
  const outsidersHistory = await request('/api/me/attempts', { cookie: outsiderCookie });
  assert.deepEqual(outsidersHistory.data, []);
  const earlyExplanation = await request('/api/generate-summary', { method: 'POST', cookie: memberCookie, body: { testID: 'test-core-1', questionIndex: 0 } });
  assert.equal(earlyExplanation.status, 403);
  const submitted = await request('/api/test/submit', { method: 'POST', cookie: memberCookie, body: { testID: 'test-core-1', selectedOptions: ['4'] } });
  assert.equal(submitted.status, 200);
  assert.equal(submitted.data.results.score, 1);
  assert.equal(submitted.data.testQuestions[0].answer, '4');
  const completedAttempts = await request('/api/me/attempts', { cookie: memberCookie });
  assert.equal(completedAttempts.data[0].results.percentage, 100);
  assert.equal(completedAttempts.data[0].isEnded, true);
  const changedAnswer = await request('/api/test/saveoptions', { method: 'POST', cookie: memberCookie, body: { testID: 'test-core-1', selectedOptions: ['3'] } });
  assert.equal(changedAnswer.status, 409);
  const results = await request(`/api/teams/${teamId}/results`, { cookie: ownerCookie });
  assert.equal(results.status, 200);
  assert.equal(results.data[0].score, 1);
  const memberResults = await request(`/api/teams/${teamId}/results`, { cookie: memberCookie });
  // Current members can compare rankings; users outside the team cannot.
  assert.equal(memberResults.status, 200);
  assert.equal(memberResults.data[0].score, 1);
  assert.equal((await request(`/api/teams/${teamId}/results`, { cookie: outsiderCookie })).status, 404);
  await t.test('platform access is separate from team roles and revoked immediately', async () => {
    const previousOwner = process.env.PLATFORM_OWNER_EMAIL;
    process.env.PLATFORM_OWNER_EMAIL = '';
    try {
      assert.equal((await request('/api/admin/overview', { cookie: ownerCookie })).status, 403);
      assert.equal((await request('/api/admin/overview', { cookie: memberCookie })).status, 403);
      assert.equal((await request('/api/admin/overview')).status, 401);
      assert.equal((await request('/api/admin/members', { method: 'POST', cookie: outsiderCookie, body: { email: 'outsider@example.test' } })).status, 403);
      process.env.PLATFORM_OWNER_EMAIL = 'owner@example.test';
      assert.equal((await request('/api/me', { cookie: ownerCookie })).data.platformRole, 'owner');
      const totals = await request('/api/admin/overview', { cookie: ownerCookie });
      assert.equal(totals.data.users, 3);
      assert.equal(totals.data.assessments, 2);
      assert.equal(totals.data.queued, 1);
      assert.equal(totals.data.completed, 1);
      assert.equal((await request('/api/admin/members', { method: 'POST', cookie: ownerCookie, body: { email: 'missing@example.test' } })).status, 404);
      const grant = await request('/api/admin/members', { method: 'POST', cookie: ownerCookie, body: { email: ' MEMBER@example.test ' } });
      assert.equal(grant.status, 201);
      assert.equal((await request('/api/me', { cookie: memberCookie })).data.platformRole, 'admin');
      assert.equal((await request('/api/admin/members', { method: 'POST', cookie: ownerCookie, body: { email: 'member@example.test' } })).status, 409);
      const users = await request('/api/admin/users?q=outsider', { cookie: memberCookie });
      assert.equal(users.status, 200);
      assert.equal(users.data.total, 1);
      assert.equal(users.data.rows[0].email, 'outsider@example.test');
      assert.deepEqual(Object.keys(users.data.rows[0]).sort(), ['createdAt', 'email', 'id', 'name']);
      assert.equal((await request('/api/admin/users?q=%5B', { cookie: memberCookie })).data.total, 0);
      assert.equal((await request('/api/admin/assessments?status=Queued', { cookie: memberCookie })).data.total, 1);
      const allResults = await request('/api/admin/results?q=member', { cookie: memberCookie });
      assert.equal(allResults.data.total, 1);
      assert.equal(allResults.data.rows[0].name, 'Core test');
      assert.equal(allResults.data.rows[0].participant.password, undefined);
      assert.equal((await request('/api/admin/teams', { cookie: memberCookie })).data.rows[0].members.length, 2);
      assert.equal((await request('/api/admin/members', { method: 'POST', cookie: memberCookie, body: { email: 'outsider@example.test' } })).status, 403);
      assert.equal((await request(`/api/admin/members/${grant.data.id}`, { method: 'DELETE', cookie: memberCookie })).status, 403);
      assert.equal((await request(`/api/admin/members/${ownerUser.id}`, { method: 'DELETE', cookie: ownerCookie })).status, 400);
      assert.equal((await request(`/api/admin/members/${grant.data.id}`, { method: 'DELETE', cookie: ownerCookie })).status, 200);
      assert.equal((await request('/api/admin/users', { cookie: memberCookie })).status, 403);
      assert.equal((await request('/api/me', { cookie: memberCookie })).data.platformRole, 'member');
      const access = await request('/api/admin/members', { cookie: ownerCookie });
      assert.equal(access.data.admins.length, 0);
      assert.deepEqual(access.data.audit.map((event) => event.action), ['revoked', 'granted']);
    } finally {
      if (previousOwner === undefined) delete process.env.PLATFORM_OWNER_EMAIL;
      else process.env.PLATFORM_OWNER_EMAIL = previousOwner;
    }
  });
  const changedPassword = await request('/api/me/password', { method: 'POST', cookie: memberCookie, body: {
    currentPassword: 'StrongPassword123!', newPassword: 'AnotherStrongPassword123!',
  } });
  assert.equal(changedPassword.status, 200);
  const newMemberCookie = authCookie(changedPassword.cookies);
  const oldSession = await request('/api/me', { cookie: memberCookie });
  assert.equal(oldSession.status, 401);
  const newSession = await request('/api/me', { cookie: newMemberCookie });
  assert.equal(newSession.status, 200);
  const logout = await request('/api/logout', { method: 'POST', cookie: newMemberCookie });
  assert.equal(logout.status, 204);
  const revoked = await request('/api/me', { cookie: newMemberCookie });
  assert.equal(revoked.status, 401);
});
