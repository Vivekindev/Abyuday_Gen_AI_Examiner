import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { interactionExamples } from '../client/src/components/assessment/examples.js';
import { activityExamples } from '../client/src/components/assessment/activityExamples.js';
import { energyEngine, energyQuestion, energyObjective } from './fixtures/dynamic.js';
import { createEngineRegistry, engineScope } from '../functions/assessment/engineRegistry.js';
import { AssessmentEngine, EngineRequest } from '../models/assessmentEngine.js';

process.env.MONGODB_URI = `mongodb://127.0.0.1:27017/abyuday_test_interactive_${Date.now()}`;
process.env.ACCESS_TOKEN_SECRET = 'test-interactive-access-secret';
process.env.REFRESH_TOKEN_SECRET = 'test-interactive-refresh-secret';
process.env.TEST_TOKEN_SECRET = 'test-interactive-exam-secret';
const { default: app } = await import('../index.js');
const { default: Generated } = await import('../models/generatedTests.js');
const { default: Task } = await import('../models/pendingTasksDB.js');
const { default: User } = await import('../models/usersData.js');
const { default: Attempt } = await import('../models/testWindow.js');
const { flushTelemetry } = await import('../functions/telemetry.js');

test('interactive API hides solutions, persists structured answers, grades and locks submissions', async (t) => {
  await mongoose.connect(process.env.MONGODB_URI);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await flushTelemetry();
    assert.match(mongoose.connection.name, /^abyuday_test_interactive_/);
    await mongoose.connection.dropDatabase(); await mongoose.disconnect();
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let cookie = '';
  async function post(path, body) {
    const res = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(body) });
    const bodyText = await res.text();
    return { status: res.status, data: res.headers.get('content-type')?.includes('application/json') ? JSON.parse(bodyText) : bodyText, cookies: res.headers.getSetCookie() };
  }
  const registration = await post('/register', { username: 'Interactive tester', email: 'interactive@example.test', password: 'StrongPassword123!' });
  assert.equal(registration.status, 201);
  cookie = registration.cookies.map((item) => item.split(';')[0]).join('; ');
  const user = await User.findOne({ email: 'interactive@example.test' });
  const testID = 'interactive-api-1';
  await Task.create({ testID, testName: 'Interactive lab', testPrompt: 'Mixed learning', questionCount: 4, testDifficulty: 5, testModel: 'gemini-3.5-flash-lite', status: 'Done', assessmentMode: 'interactive', user: user._id });
  await Generated.create({ testID, user: user._id, response: interactionExamples });
  const info = await post('/test/getinfo', { testID });
  assert.equal(info.data.testTime, '15 minutes');
  const start = await post('/test/begin', { testID });
  assert.equal(start.status, 200); assert.ok(start.data.remTime > 890 && start.data.remTime <= 900);
  assert.equal(start.data.testQuestions[2].answer, undefined);
  assert.equal(start.data.testQuestions[0].explanation, undefined);
  assert.equal((await post('/generate-summary', { testID, questionIndex: 0 })).status, 403);
  const forged = [{ ...interactionExamples[0].config.initial, correct: true }, '', '', ''];
  assert.equal((await post('/test/saveoptions', { testID, selectedOptions: forged })).status, 400);
  const answers = [{ r1: 1000, r2: 1000, topology: 'parallel', closed: true }, { slope: 2, intercept: 1 }, interactionExamples[2].answer, interactionExamples[3].answer];
  assert.equal((await post('/test/saveoptions', { testID, selectedOptions: answers })).status, 200);
  assert.deepEqual((await post('/test/begin', { testID })).data.selectedOptions, answers);
  const submitted = await post('/test/submit', { testID, selectedOptions: answers });
  assert.equal(submitted.data.results.score, 4); assert.equal(submitted.data.results.percentage, 100);
  assert.equal(submitted.data.results.outcomes.every((item) => item.correct), true);
  assert.deepEqual(submitted.data.testQuestions[2].answer, interactionExamples[2].answer);
  assert.equal((await post('/generate-summary', { testID, questionIndex: 0 })).data.summary, interactionExamples[0].explanation);
  assert.equal((await post('/test/saveoptions', { testID, selectedOptions: ['', '', '', ''] })).status, 409);
  assert.equal((await post('/test/submit', { testID, selectedOptions: ['', '', '', ''] })).data.results.score, 4);

  await t.test('new activity types persist partial work, hide solutions and grade completed responses', async () => {
    const activityID = 'activity-templates-api';
    await Generated.create({ testID: activityID, user: user._id, response: activityExamples });
    const started = await post('/test/begin', { testID: activityID });
    assert.equal(started.status, 200);
    assert.equal(started.data.testQuestions.length, 5);
    for (const q of started.data.testQuestions) { assert.equal(q.answer, undefined); assert.equal(q.explanation, undefined); }
    const partial = [['dna', '', ''], ['', 'carbon', ''], ['rabbit'], [], { position: 0 }];
    assert.equal((await post('/test/saveoptions', { testID: activityID, selectedOptions: partial })).status, 200);
    assert.deepEqual((await post('/test/begin', { testID: activityID })).data.selectedOptions, partial);
    const forged = structuredClone(partial); forged[2] = ['rabbit', 'rabbit'];
    assert.equal((await post('/test/saveoptions', { testID: activityID, selectedOptions: forged })).status, 400);
    const correct = activityExamples.map((q) => q.kind === 'numberline' ? { position: q.answer } : q.answer);
    const finished = await post('/test/submit', { testID: activityID, selectedOptions: correct });
    assert.equal(finished.status, 200);
    assert.equal(finished.data.results.score, 5);
    assert.equal(finished.data.results.percentage, 100);
    assert.deepEqual(finished.data.testQuestions.map((q) => q.answer), activityExamples.map((q) => q.answer));
    assert.equal((await post('/test/saveoptions', { testID: activityID, selectedOptions: partial })).status, 409);
  });

  await Generated.create({ testID: 'interactive-expiry', user: user._id, response: [interactionExamples[0]] });
  await post('/test/begin', { testID: 'interactive-expiry' });
  await Attempt.updateOne({ testID: 'interactive-expiry' }, { $set: { expiryTime: new Date(Date.now() - 1000) } });
  const expired = await post('/test/submit', { testID: 'interactive-expiry', selectedOptions: [answers[0]] });
  assert.equal(expired.data.results.score, 0); assert.equal(expired.data.results.unanswered, 1);

  await Generated.create({ testID: 'interactive-concurrent', user: user._id, response: [interactionExamples[0]] });
  await post('/test/begin', { testID: 'interactive-concurrent' });
  const competing = await Promise.all([
    post('/test/submit', { testID: 'interactive-concurrent', selectedOptions: [answers[0]] }),
    post('/test/submit', { testID: 'interactive-concurrent', selectedOptions: [''] }),
  ]);
  assert.deepEqual(competing[0].data.results, competing[1].data.results);
  assert.deepEqual(competing[0].data.selectedOptions, competing[1].data.selectedOptions);
  assert.equal((await post('/test/saveoptions', { testID: 'interactive-concurrent', selectedOptions: [answers[0]] })).status, 409);

  for (const assessmentMode of ['interactive', 'execute-js']) {
    const rejected = await post('/test/create', { testName: 'Bad format', prompt: 'Electronics circuit tasks', numQuestions: 21, difficulty: 5, assessmentMode });
    assert.equal(rejected.status, 400);
  }

  await t.test('dynamic engines register once, record requests and preserve attempt snapshots', async () => {
    await Promise.all([AssessmentEngine.init(), EngineRequest.init()]);
    const context = { user: user._id, testID: 'dynamic-api-1' };
    const registry = createEngineRegistry(context);
    await registry.recordRequests([energyObjective]);
    let builds = 0;
    const resolve = (reg, slot) => reg.resolve({ key: energyEngine.key, domain: 'physics', objective: 'Tune kinetic energy', requirement: energyObjective.engineRequirement, slot, build: async () => { builds++; return { supported: true, definition: energyEngine }; } });
    const registered = await resolve(registry, 0);
    assert.deepEqual(registered, energyEngine);
    const reused = await resolve(createEngineRegistry({ ...context, testID: 'dynamic-api-2' }), 0);
    assert.deepEqual(reused, energyEngine); assert.equal(builds, 1);
    assert.deepEqual((await EngineRequest.find({ scope: engineScope(context) }).sort({ testID: 1 }).lean()).map((r) => r.status), ['ready', 'reused']);
    assert.equal((await registry.catalog())[0].key, energyEngine.key);
    await Generated.create({ testID: context.testID, user: user._id, response: [{ ...energyQuestion, config: { ...energyQuestion.config, engine: registered } }] });
    const started = await post('/test/begin', { testID: context.testID });
    assert.equal(started.data.testQuestions[0].checks, undefined);
    assert.equal(started.data.testQuestions[0].answer, undefined);
    assert.ok(started.data.remTime > 230 && started.data.remTime <= 240);
    assert.equal((await post('/test/saveoptions', { testID: context.testID, selectedOptions: [{ mass: '999999', speed: '1' }] })).status, 400);
    assert.equal((await post('/test/saveoptions', { testID: context.testID, selectedOptions: [energyQuestion.answer] })).status, 200);
    assert.deepEqual((await post('/test/begin', { testID: context.testID })).data.selectedOptions, [energyQuestion.answer]);
    // Historical assessments carry their own frozen definition, independent of registry storage.
    await AssessmentEngine.updateOne({ scope: engineScope(context), key: energyEngine.key }, { $set: { 'definition.title': 'Later catalog title' } });
    const complete = await post('/test/submit', { testID: context.testID });
    assert.equal(complete.data.results.score, 1);
    assert.equal(complete.data.testQuestions[0].config.engine.title, energyEngine.title);
    const library = await fetch(`${base}/engines`, { headers: { Cookie: cookie } });
    const personal = await library.json();
    assert.equal(personal.engines.length, 1); assert.equal(personal.total, 2);
    assert.equal(personal.engines[0].buildToken, undefined);
    const myCookie = cookie;
    const outsider = await post('/register', { username: 'Other learner', email: 'other-dynamic@example.test', password: 'StrongPassword123!' });
    cookie = outsider.cookies.map((item) => item.split(';')[0]).join('; ');
    const otherLibrary = await (await fetch(`${base}/engines`, { headers: { Cookie: cookie } })).json();
    assert.equal(otherLibrary.engines.length, 0); assert.equal(otherLibrary.total, 0);
    const outsiderCookie = cookie; cookie = myCookie;
    const team = await post('/teams', { name: 'Dynamic lab team' });
    const teamContext = { user: user._id, team: team.data.id, testID: 'dynamic-team' };
    await resolve(createEngineRegistry(teamContext), 0);
    assert.equal(builds, 2, 'Personal engine is not reused across team boundaries');
    const teamLibrary = await (await fetch(`${base}/engines?teamId=${team.data.id}`, { headers: { Cookie: cookie } })).json();
    assert.equal(teamLibrary.engines.length, 1);
    assert.equal((await fetch(`${base}/engines?teamId=${team.data.id}`, { headers: { Cookie: outsiderCookie } })).status, 403);
  });

  await t.test('engine build failures, unsupported capabilities and concurrency are visible and recoverable', async () => {
    const context = { user: user._id, testID: 'dynamic-failure' };
    const registry = createEngineRegistry(context);
    await assert.rejects(registry.resolve({ key: 'unsupported-lab', domain: 'coding', objective: 'Run code', requirement: 'Execute arbitrary code', slot: 0, build: async () => ({ supported: false, reason: 'This runtime cannot execute code.' }) }), /outside/);
    assert.equal((await EngineRequest.findOne({ testID: context.testID })).status, 'unsupported');
    assert.equal(await AssessmentEngine.countDocuments({ key: 'unsupported-lab', status: 'ready' }), 0);
    await assert.rejects(registry.resolve({ key: 'broken-lab', domain: 'physics', objective: 'Energy', requirement: 'Calculate energy', slot: 1, build: async () => ({ supported: true, definition: { ...energyEngine, key: 'broken-lab', script: 'invalid' } }) }), /fields/);
    assert.equal((await EngineRequest.findOne({ testID: context.testID, slot: 1 })).status, 'failed');
    await registry.recordAdaptation(1, 'matching');
    const adapted = await EngineRequest.findOne({ testID: context.testID, slot: 1 });
    assert.equal(adapted.status, 'adapted');
    assert.match(adapted.message, /recovered as a matching activity/);
    await AssessmentEngine.create({ scope: engineScope(context), key: 'leased-lab', status: 'building', buildToken: 'another-worker', leaseUntil: new Date(Date.now() + 60000), user: user._id });
    let builds = 0;
    const params = { key: 'leased-lab', domain: 'physics', objective: 'Energy', requirement: 'Calculate energy', slot: 2, build: async () => { builds++; return { supported: true, definition: { ...energyEngine, key: 'leased-lab' } }; } };
    await assert.rejects(registry.resolve(params), (error) => error.status === 503);
    assert.equal(builds, 0);
    await AssessmentEngine.updateOne({ key: 'leased-lab' }, { $set: { leaseUntil: new Date(Date.now() - 1000) } });
    await registry.resolve(params);
    assert.equal(builds, 1);
    assert.equal((await EngineRequest.findOne({ testID: context.testID, slot: 2 })).status, 'ready');
  });
});
