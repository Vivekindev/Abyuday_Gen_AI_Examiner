import { Router } from "express";
import mongoose from "mongoose";
import { authenticateToken } from "../functions/authFunctions.js";
import { requirePlatformAdmin } from "../functions/platformAccess.js";
import { getTeamMembership, canManageTeam } from "../functions/teamAccess.js";
import {
  telemetryHealth,
  initializeMonitoring,
} from "../functions/telemetry.js";
import {
  AiUsage,
  ApiUsage,
  Activity,
  MonitoringState,
} from "../models/telemetry.js";
import Users from "../models/usersData.js";
import Tasks from "../models/pendingTasksDB.js";

const router = Router();
const DAY = 86400000;
const fields = [
  "promptTokens",
  "outputTokens",
  "thinkingTokens",
  "cachedTokens",
  "toolTokens",
  "totalTokens",
];
const sumWhen = (condition) => ({ $sum: { $cond: [condition, 1, 0] } });
const aiGroup = {
  calls: { $sum: 1 },
  measuredCalls: sumWhen({ $ne: ["$totalTokens", null] }),
  failed: sumWhen({ $eq: ["$status", "failed"] }),
  pending: sumWhen({ $eq: ["$status", "in_progress"] }),
  averageMs: { $avg: "$durationMs" },
  maxMs: { $max: "$durationMs" },
  lastAt: { $max: "$startedAt" },
  ...Object.fromEntries(
    fields.map((field) => [field, { $sum: { $ifNull: [`$${field}`, 0] } }]),
  ),
};
const apiGroup = {
  requests: { $sum: 1 },
  errors: sumWhen({ $gte: ["$status", 400] }),
  serverErrors: sumWhen({ $gte: ["$status", 500] }),
  rateLimited: sumWhen({ $eq: ["$status", 429] }),
  averageMs: { $avg: "$durationMs" },
  maxMs: { $max: "$durationMs" },
};
const activityGroup = {
  events: { $sum: 1 },
  started: sumWhen({ $eq: ["$action", "attempt.started"] }),
  completed: sumWhen({ $eq: ["$action", "attempt.completed"] }),
  created: sumWhen({ $eq: ["$action", "assessment.created"] }),
  lastAt: { $max: "$createdAt" },
};
const id = (value) =>
  mongoose.isObjectIdOrHexString(value)
    ? new mongoose.Types.ObjectId(value)
    : null;
const person = (user) =>
  user
    ? { id: String(user._id), name: user.userName || "User", email: user.email }
    : null;
const pagination = (query) => ({
  page: Math.min(10000, Math.max(1, parseInt(query.page, 10) || 1)),
  limit: 20,
});
const regex = (value) =>
  new RegExp(
    String(value || "")
      .slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    "i",
  );
const scopeMatch = (scope, type, includeUser = true) => ({
  ...(scope.team ? { team: scope.team._id } : {}),
  ...(includeUser && scope.user ? { user: scope.user._id } : {}),
  [type === "ai" ? "startedAt" : "createdAt"]: {
    $gte:
      type === "api"
        ? scope.apiFrom
        : type === "activity"
          ? scope.activityFrom
          : scope.from,
    $lte: scope.now,
  },
});

async function prepareScope(req, res, next) {
  try {
    const days = req.query.days || "30";
    if (!["7", "30", "90", "all"].includes(days))
      return res
        .status(400)
        .json({ error: "Choose a valid monitoring period." });
    let team;
    if (req.params.teamId) {
      const membership = await getTeamMembership(
        req.params.teamId,
        req.user.id,
      );
      if (!membership) return res.sendStatus(404);
      if (!canManageTeam(membership.role)) return res.sendStatus(403);
      team = membership.team;
    }
    let user;
    if (req.query.userId) {
      const userId = id(req.query.userId);
      if (!userId)
        return res.status(400).json({ error: "Invalid user filter." });
      if (
        team &&
        !team.members.some((member) => member.user.equals(userId)) &&
        !(await Activity.exists({ team: team._id, user: userId })) &&
        !(await AiUsage.exists({ team: team._id, user: userId }))
      )
        return res.sendStatus(404);
      user = await Users.findById(userId).select("userName email").lean();
      if (!user) return res.sendStatus(404);
    }
    const now = new Date();
    const from =
      days === "all"
        ? new Date(0)
        : new Date(now.getTime() - Number(days) * DAY);
    req.monitorScope = {
      team,
      user,
      now,
      from,
      apiFrom: new Date(Math.max(+from, +now - 30 * DAY)),
      activityFrom: new Date(Math.max(+from, +now - 90 * DAY)),
    };
    res.set("Cache-Control", "no-store");
    next();
  } catch (error) {
    next(error);
  }
}

router.use("/admin/monitoring", authenticateToken, requirePlatformAdmin);
router.use("/teams/:teamId/monitoring", authenticateToken);

const endpoints = ["/admin/monitoring", "/teams/:teamId/monitoring"];
router.get(endpoints, prepareScope, async (req, res, next) => {
  try {
    const scope = req.monitorScope;
    const aiMatch = scopeMatch(scope, "ai");
    const apiMatch = scopeMatch(scope, "api");
    const activityMatch = scopeMatch(scope, "activity");
    const [aiData, apiData, activities, tracking, worker, queue] =
      await Promise.all([
        AiUsage.aggregate([
          { $match: aiMatch },
          {
            $facet: {
              summary: [{ $group: { _id: null, ...aiGroup } }],
              models: [
                { $group: { _id: "$model", ...aiGroup } },
                { $sort: { totalTokens: -1 } },
              ],
              operations: [{ $group: { _id: "$operation", ...aiGroup } }],
              daily: [
                {
                  $match: {
                    startedAt: {
                      $gte: new Date(
                        Math.max(+scope.from, +scope.now - 30 * DAY),
                      ),
                    },
                  },
                },
                {
                  $group: {
                    _id: {
                      $dateToString: {
                        date: "$startedAt",
                        format: "%Y-%m-%d",
                        timezone: "UTC",
                      },
                    },
                    ...aiGroup,
                  },
                },
                { $sort: { _id: 1 } },
              ],
            },
          },
        ]),
        ApiUsage.aggregate([
          { $match: apiMatch },
          {
            $facet: {
              summary: [{ $group: { _id: null, ...apiGroup } }],
              routes: [
                {
                  $group: {
                    _id: { route: "$route", method: "$method" },
                    ...apiGroup,
                  },
                },
                { $sort: { requests: -1 } },
                { $limit: 10 },
              ],
            },
          },
        ]),
        Activity.aggregate([
          { $match: activityMatch },
          { $group: { _id: "$action", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        initializeMonitoring(),
        scope.team ? null : MonitoringState.findById("worker").lean(),
        Tasks.aggregate([
          {
            $match: {
              ...(scope.team ? { team: scope.team._id } : {}),
              ...(scope.user ? { user: scope.user._id } : {}),
            },
          },
          {
            $group: {
              _id: { $toLower: "$status" },
              count: { $sum: 1 },
              oldest: { $min: { $toDate: "$_id" } },
            },
          },
        ]),
      ]);
    const memory = process.memoryUsage();
    res.json({
      scope: scope.team?.name || "Platform",
      selectedUser: person(scope.user),
      trackingSince: tracking.startedAt,
      windows: {
        aiFrom: scope.from,
        apiFrom: scope.apiFrom,
        activityFrom: scope.activityFrom,
      },
      ai: {
        ...aiData[0],
        summary: aiData[0].summary[0] || {
          calls: 0,
          measuredCalls: 0,
          failed: 0,
          pending: 0,
          ...Object.fromEntries(fields.map((field) => [field, 0])),
        },
      },
      api: {
        ...apiData[0],
        summary: apiData[0].summary[0] || {
          requests: 0,
          errors: 0,
          serverErrors: 0,
          rateLimited: 0,
        },
      },
      activities,
      queue,
      runtime: scope.team
        ? null
        : {
            uptimeSeconds: Math.floor(process.uptime()),
            nodeVersion: process.version,
            rssBytes: memory.rss,
            heapUsedBytes: memory.heapUsed,
            heapTotalBytes: memory.heapTotal,
            databaseConnected: mongoose.connection.readyState === 1,
            ...telemetryHealth(),
            worker: worker
              ? {
                  status: worker.workerStatus,
                  lastPollAt: worker.lastPollAt,
                  lastCompletedAt: worker.lastCompletedAt,
                  currentTestID: worker.currentTestID,
                }
              : null,
          },
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  endpoints.map((path) => `${path}/users`),
  prepareScope,
  async (req, res, next) => {
    try {
      const scope = req.monitorScope;
      const { page, limit } = pagination(req.query);
      const filter = scope.team
        ? { _id: { $in: scope.team.members.map((member) => member.user) } }
        : {};
      if (req.query.q)
        filter.$or = [
          { userName: regex(req.query.q) },
          { email: regex(req.query.q) },
        ];
      const lookup = (model, name, type, group) => ({
        $lookup: {
          from: model.collection.name,
          let: { owner: "$_id" },
          pipeline: [
            {
              $match: {
                ...scopeMatch(scope, type, false),
                $expr: { $eq: ["$user", "$$owner"] },
              },
            },
            { $group: { _id: null, ...group } },
          ],
          as: name,
        },
      });
      const sort = {
        tokens: { "ai.totalTokens": -1, _id: 1 },
        activity: { "activity.lastAt": -1, _id: 1 },
        requests: { "api.requests": -1, _id: 1 },
      }[req.query.sort || "tokens"];
      if (!sort) return res.status(400).json({ error: "Invalid sort." });
      const [data] = await Users.aggregate([
        { $match: filter },
        { $project: { email: 1, userName: 1 } },
        lookup(AiUsage, "ai", "ai", aiGroup),
        lookup(ApiUsage, "api", "api", apiGroup),
        lookup(Activity, "activity", "activity", activityGroup),
        {
          $set: {
            ai: { $ifNull: [{ $first: "$ai" }, {}] },
            api: { $ifNull: [{ $first: "$api" }, {}] },
            activity: { $ifNull: [{ $first: "$activity" }, {}] },
          },
        },
        { $sort: sort },
        {
          $facet: {
            count: [{ $count: "total" }],
            rows: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          },
        },
      ]);
      const total = data.count[0]?.total || 0;
      res.json({
        rows: data.rows.map((row) => ({
          ...person(row),
          ai: row.ai,
          api: row.api,
          activity: row.activity,
        })),
        total,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  endpoints.map((path) => `${path}/events`),
  prepareScope,
  async (req, res, next) => {
    try {
      const kind = req.query.kind || "activity";
      const Model = { activity: Activity, ai: AiUsage, api: ApiUsage }[kind];
      if (!Model) return res.status(400).json({ error: "Invalid event type." });
      const match = scopeMatch(req.monitorScope, kind);
      const { page, limit } = pagination(req.query);
      if (kind === "activity" && req.query.action)
        match.action = String(req.query.action).slice(0, 80);
      if (kind === "ai" && req.query.status) {
        if (!["success", "failed", "in_progress"].includes(req.query.status))
          return res.status(400).json({ error: "Invalid status." });
        match.status = req.query.status;
      }
      if (kind === "api" && req.query.status === "errors")
        match.status = { $gte: 400 };
      const query = Model.find(match)
        .select("-__v -eventKey")
        .populate("user", "userName email")
        .sort({ [kind === "ai" ? "startedAt" : "createdAt"]: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      if (kind === "activity") query.populate("targetUser", "userName email");
      const [rows, total] = await Promise.all([
        query.lean(),
        Model.countDocuments(match),
      ]);
      const testNames = await Tasks.find({
        testID: { $in: rows.map((row) => row.testID).filter(Boolean) },
        ...(req.monitorScope.team ? { team: req.monitorScope.team._id } : {}),
      })
        .select("testID testName")
        .lean();
      const names = new Map(
        testNames.map((task) => [task.testID, task.testName]),
      );
      res.json({
        rows: rows.map(({ _id, user, targetUser, team, ...row }) => ({
          ...row,
          id: String(_id),
          user: person(user),
          targetUser: person(targetUser),
          testName: names.get(row.testID) || row.testID || null,
        })),
        total,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
