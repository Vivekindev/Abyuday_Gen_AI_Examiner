import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

process.env.MONGODB_URI = `mongodb://127.0.0.1:27017/abyuday_test_monitoring_${Date.now()}`;
process.env.ACCESS_TOKEN_SECRET = "monitoring-test-access-secret";
process.env.REFRESH_TOKEN_SECRET = "monitoring-test-refresh-secret";
process.env.PLATFORM_OWNER_EMAIL = "platform@example.test";
const { default: app } = await import("../index.js");
const { default: Users } = await import("../models/usersData.js");
const { default: Team } = await import("../models/team.js");
const { default: Tasks } = await import("../models/pendingTasksDB.js");
const { default: Tests } = await import("../models/generatedTests.js");
const { AiUsage, ApiUsage, Activity } = await import("../models/telemetry.js");
const { meteredGeneration, tokenMetadata, flushTelemetry } = await import(
  "../functions/telemetry.js"
);

test("token fields retain unknowns and never add cached input twice", () => {
  const tokens = tokenMetadata({
    promptTokenCount: 100,
    cachedContentTokenCount: 20,
    candidatesTokenCount: 25,
    thoughtsTokenCount: 5,
    totalTokenCount: 130,
  });
  assert.equal(tokens.totalTokens, 130);
  assert.equal(tokens.promptTokens, 100);
  assert.equal(tokens.cachedTokens, 20);
  assert.equal(tokens.toolTokens, null);
  assert.equal(tokenMetadata({ totalTokenCount: -1 }).totalTokens, null);
  assert.equal(tokenMetadata({ totalTokenCount: 0 }).totalTokens, 0);
  assert.equal(tokenMetadata().totalTokens, null);
});

test("monitoring attributes calls, records activities, and enforces team isolation", async (t) => {
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([AiUsage.init(), ApiUsage.init(), Activity.init()]);
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await flushTelemetry();
    assert.match(mongoose.connection.name, /^abyuday_test_monitoring_/);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, cookie, method = "GET", body) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const raw = await response.text();
    await flushTelemetry();
    return {
      status: response.status,
      data: response.headers.get("content-type")?.includes("application/json")
        ? JSON.parse(raw)
        : raw,
      cookie: response.headers
        .getSetCookie()
        .filter((value) => /^(accessToken|refreshToken)=/.test(value))
        .map((value) => value.split(";")[0])
        .join("; "),
    };
  };
  const accounts = {};
  for (const name of ["platform", "lead", "learner", "other"]) {
    const result = await request("/api/register", null, "POST", {
      username: name,
      email: `${name}@example.test`,
      password: "SafeTestPassword123!",
    });
    assert.equal(result.status, 201);
    accounts[name] = {
      cookie: result.cookie,
      user: await Users.findOne({ email: `${name}@example.test` }),
    };
  }
  const { platform, lead, learner, other } = accounts;
  const alpha = await Team.create({
    name: "Alpha",
    members: [
      { user: lead.user._id, role: "owner" },
      { user: learner.user._id, role: "member" },
      { user: other.user._id, role: "admin" },
    ],
  });
  const beta = await Team.create({
    name: "Beta",
    members: [
      { user: other.user._id, role: "owner" },
      { user: learner.user._id, role: "member" },
    ],
  });
  const context = {
    user: learner.user._id,
    team: alpha._id,
    testID: "alpha-test",
  };
  const run = (execute, overrides = {}) =>
    meteredGeneration({
      context,
      model: "test-model",
      operation: "explanation",
      execute,
      ...overrides,
    });
  const response = {
    text: "Explanation",
    usageMetadata: {
      promptTokenCount: 100,
      candidatesTokenCount: 25,
      thoughtsTokenCount: 5,
      cachedContentTokenCount: 20,
      totalTokenCount: 130,
    },
  };
  await run(async () => response);
  await assert.rejects(
    run(async () => {
      const error = Error("Sensitive provider payload must not be logged");
      error.status = 503;
      throw error;
    }),
  );
  await assert.rejects(
    run(
      async () => ({
        text: "bad output",
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15,
        },
      }),
      {
        validate: () => {
          throw Error("Invalid JSON");
        },
      },
    ),
  );
  await run(
    async () => ({ text: "private", usageMetadata: { totalTokenCount: 900 } }),
    { context: { user: learner.user._id } },
  );
  await run(
    async () => ({ text: "beta", usageMetadata: { totalTokenCount: 200 } }),
    { context: { user: learner.user._id, team: beta._id } },
  );
  await AiUsage.create({
    ...context,
    model: "test-model",
    operation: "questions",
    status: "in_progress",
  });
  await AiUsage.create({
    user: learner.user._id,
    model: "old-model",
    operation: "questions",
    status: "success",
    totalTokens: 77,
    startedAt: new Date(Date.now() - 180 * 86400000),
  });
  let invoked = false;
  await assert.rejects(
    run(
      async () => {
        invoked = true;
      },
      { context: {} },
    ),
  );
  assert.equal(invoked, false);
  const stored = await AiUsage.find({ team: alpha._id })
    .sort({ startedAt: 1 })
    .lean();
  assert.equal(stored[0].totalTokens, 130);
  assert.equal(stored[1].totalTokens, null);
  assert.equal(stored[1].errorCode, "PROVIDER_UNAVAILABLE");
  assert.equal(stored[2].totalTokens, 15);
  assert.equal(stored[2].status, "failed");
  assert.equal(stored[2].errorCode, "INVALID_RESPONSE");
  assert.ok(stored[0].durationMs >= 0);
  assert.equal(JSON.stringify(stored).includes("Sensitive provider"), false);

  await Tasks.create({
    testID: "alpha-test",
    testName: "Alpha assessment",
    testPrompt: "Private prompt never exposed in telemetry",
    questionCount: "1",
    testDifficulty: "5",
    testModel: "test-model",
    status: "Done",
    user: lead.user._id,
    team: alpha._id,
  });
  await Tests.create({
    testID: "alpha-test",
    user: lead.user._id,
    team: alpha._id,
    response: [
      {
        questionText: "2+2?",
        options: ["1", "2", "3", "4"],
        answer: "4",
        tag: [],
      },
    ],
  });
  assert.equal(
    (
      await request("/api/test/begin", learner.cookie, "POST", {
        testID: "alpha-test",
      })
    ).status,
    200,
  );
  await request("/api/test/begin", learner.cookie, "POST", {
    testID: "alpha-test",
  });
  await request("/api/test/saveoptions", learner.cookie, "POST", {
    testID: "alpha-test",
    selectedOptions: ["4"],
  });
  await request("/api/test/submit", learner.cookie, "POST", {
    testID: "alpha-test",
  });
  await request("/api/test/submit", learner.cookie, "POST", {
    testID: "alpha-test",
  });
  assert.equal(
    await Activity.countDocuments({
      action: "attempt.started",
      user: learner.user._id,
    }),
    1,
  );
  assert.equal(
    await Activity.countDocuments({
      action: "attempt.completed",
      user: learner.user._id,
    }),
    1,
  );
  await Activity.create({ user: learner.user._id, action: "password.changed" });
  await Activity.create({
    user: learner.user._id,
    team: beta._id,
    action: "assessment.viewed",
    testID: "beta-private",
  });
  await Activity.insertMany(
    Array.from({ length: 23 }, () => ({
      user: learner.user._id,
      team: alpha._id,
      action: "assessment.viewed",
      testID: "alpha-test",
    })),
  );

  const teamPath = `/api/teams/${alpha.id}/monitoring`;
  assert.equal(
    (await request("/api/admin/monitoring", lead.cookie)).status,
    403,
  );
  assert.equal((await request("/api/admin/monitoring")).status, 401);
  assert.equal((await request(teamPath, learner.cookie)).status, 403);
  assert.equal((await request(teamPath, platform.cookie)).status, 404);
  assert.equal((await request(teamPath, other.cookie)).status, 200);
  const alphaUsage = await request(teamPath, lead.cookie);
  assert.equal(alphaUsage.status, 200);
  assert.equal(alphaUsage.data.ai.summary.totalTokens, 145);
  assert.equal(alphaUsage.data.ai.summary.calls, 4);
  assert.equal(alphaUsage.data.ai.summary.measuredCalls, 2);
  assert.equal(alphaUsage.data.ai.summary.failed, 2);
  assert.equal(alphaUsage.data.ai.summary.pending, 1);
  assert.equal(alphaUsage.data.runtime, null);
  assert.equal(alphaUsage.data.api.summary.requests, 5);
  assert.ok(alphaUsage.data.trackingSince);
  assert.equal(
    (await request(`${teamPath}?userId=${platform.user.id}`, lead.cookie))
      .status,
    404,
  );
  assert.equal(
    (await request(`${teamPath}?days=garbage`, lead.cookie)).status,
    400,
  );
  assert.equal(
    (await request(`${teamPath}?userId=invalid`, lead.cookie)).status,
    400,
  );
  const people = await request(`${teamPath}/users?q=learner`, lead.cookie);
  assert.equal(people.data.rows[0].ai.totalTokens, 145);
  assert.equal(people.data.rows[0].activity.started, 1);
  assert.equal(people.data.rows[0].activity.completed, 1);
  assert.equal(people.data.rows[0].password, undefined);
  const activities = await request(
    `${teamPath}/events?kind=activity&userId=${learner.user.id}`,
    lead.cookie,
  );
  assert.equal(activities.data.rows.length, 20);
  assert.equal(activities.data.pages, 2);
  assert.equal(
    activities.data.rows.some((row) => row.action === "password.changed"),
    false,
  );
  assert.equal(JSON.stringify(activities.data).includes("beta-private"), false);
  assert.equal(
    JSON.stringify(activities.data).includes("selectedOptions"),
    false,
  );
  assert.equal(
    JSON.stringify(activities.data).includes("Private prompt"),
    false,
  );
  assert.equal(
    (await request(`${teamPath}/events?kind=activity&page=2`, lead.cookie)).data
      .rows.length,
    7,
  );
  assert.equal(
    (await request(`${teamPath}/events?kind=ai&status=failed`, lead.cookie))
      .data.total,
    2,
  );
  const globalUsage = await request("/api/admin/monitoring", platform.cookie);
  assert.equal(globalUsage.data.ai.summary.totalTokens, 1245);
  assert.equal(globalUsage.data.ai.summary.calls, 6);
  assert.ok(globalUsage.data.runtime.nodeVersion);
  assert.equal(
    (await request("/api/admin/monitoring?days=all", platform.cookie)).data.ai
      .summary.totalTokens,
    1322,
  );
  const requestLogs = await request(
    "/api/admin/monitoring/events?kind=api",
    platform.cookie,
  );
  const serialized = JSON.stringify(requestLogs.data);
  assert.equal(serialized.includes("SafeTestPassword"), false);
  assert.equal(serialized.includes("accessToken="), false);
  assert.ok(requestLogs.data.rows.every((row) => !row.route.includes("?")));
  const beforePoll = await ApiUsage.countDocuments();
  await request(teamPath, lead.cookie);
  await request("/api/admin/monitoring", platform.cookie);
  assert.equal(await ApiUsage.countDocuments(), beforePoll);
  await request(
    `/api/teams/${alpha.id}/members/${other.user.id}`,
    lead.cookie,
    "DELETE",
  );
  assert.equal((await request(teamPath, other.cookie)).status, 404);
});
