import { Router } from "express";
import mongoose from "mongoose";
import { authenticateToken } from "../functions/authFunctions.js";
import { requirePlatformAdmin } from "../functions/platformAccess.js";
import Users from "../models/usersData.js";
import Teams from "../models/team.js";
import Tasks from "../models/pendingTasksDB.js";
import Attempts from "../models/testWindow.js";
import PlatformAdmin from "../models/platformAdmin.js";
import AdminAudit from "../models/adminAudit.js";

const router = Router();
router.use("/admin", authenticateToken, requirePlatformAdmin);
const person = (user) =>
  user
    ? { id: String(user._id), name: user.userName || "User", email: user.email }
    : null;
const pattern = (value) =>
  new RegExp(
    String(value || "")
      .slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    "i",
  );
const pagination = (req) => ({
  page: Math.min(10000, Math.max(1, parseInt(req.query.page, 10) || 1)),
  limit: 20,
});
const pageResult = (rows, total, page, limit) => ({
  rows,
  total,
  page,
  pages: Math.max(1, Math.ceil(total / limit)),
});
const ownerOnly = (req, res, next) =>
  req.platform.role === "owner"
    ? next()
    : res
        .status(403)
        .json({ error: "Only the platform owner can manage admin access." });

router.get("/admin/overview", async (_req, res, next) => {
  try {
    const [users, teams, assessments, completed, active, statuses] =
      await Promise.all([
        Users.countDocuments(),
        Teams.countDocuments(),
        Tasks.countDocuments(),
        Attempts.countDocuments({ isEnded: true }),
        Attempts.countDocuments({
          isEnded: false,
          expiryTime: { $gt: new Date() },
        }),
        Tasks.aggregate([
          { $group: { _id: { $toLower: "$status" }, count: { $sum: 1 } } },
        ]),
      ]);
    const status = Object.fromEntries(
      statuses.map((row) => [row._id, row.count]),
    );
    res.json({
      users,
      teams,
      assessments,
      completed,
      active,
      ready: status.done || 0,
      queued: status.queued || 0,
      generating: status.processing || 0,
      failed: status.error || 0,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/users", async (req, res, next) => {
  try {
    const { page, limit } = pagination(req);
    const query = req.query.q
      ? {
          $or: [
            { email: pattern(req.query.q) },
            { userName: pattern(req.query.q) },
          ],
        }
      : {};
    const [rows, total] = await Promise.all([
      Users.find(query)
        .select("userName email")
        .sort({ _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Users.countDocuments(query),
    ]);
    res.json(
      pageResult(
        rows.map((user) => ({
          ...person(user),
          createdAt: user._id.getTimestamp(),
        })),
        total,
        page,
        limit,
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/admin/assessments", async (req, res, next) => {
  try {
    const { page, limit } = pagination(req);
    const query = req.query.q
      ? {
          $or: [
            { testName: pattern(req.query.q) },
            { testID: pattern(req.query.q) },
          ],
        }
      : {};
    if (["Done", "Queued", "Processing", "Error"].includes(req.query.status))
      query.status = new RegExp(`^${req.query.status}$`, "i");
    const [rows, total] = await Promise.all([
      Tasks.find(query)
        .select(
          "testID testName testPrompt questionCount testDifficulty testModel status user team",
        )
        .populate("user", "userName email")
        .populate("team", "name")
        .sort({ _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Tasks.countDocuments(query),
    ]);
    res.json(
      pageResult(
        rows.map((task) => ({
          id: String(task._id),
          testID: task.testID,
          name: task.testName,
          prompt: task.testPrompt,
          questions: Number(task.questionCount),
          difficulty: task.testDifficulty,
          model: task.testModel,
          status: task.status,
          creator: person(task.user),
          team: task.team?.name || null,
          createdAt: task._id.getTimestamp(),
        })),
        total,
        page,
        limit,
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/admin/teams", async (req, res, next) => {
  try {
    const { page, limit } = pagination(req);
    const query = req.query.q ? { name: pattern(req.query.q) } : {};
    const [rows, total] = await Promise.all([
      Teams.find(query)
        .populate("members.user", "userName email")
        .sort({ _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Teams.countDocuments(query),
    ]);
    res.json(
      pageResult(
        rows.map((team) => ({
          id: String(team._id),
          name: team.name,
          createdAt: team.createdAt,
          members: team.members.map((member) => ({
            ...person(member.user),
            role: member.role,
          })),
        })),
        total,
        page,
        limit,
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/admin/results", async (req, res, next) => {
  try {
    const { page, limit } = pagination(req);
    // Join before filtering so search covers the full dataset, not just one page.
    const pipeline = [
      { $match: { isEnded: true } },
      {
        $lookup: {
          from: Users.collection.name,
          localField: "user",
          foreignField: "_id",
          as: "participant",
        },
      },
      {
        $lookup: {
          from: Tasks.collection.name,
          localField: "testID",
          foreignField: "testID",
          as: "assessment",
        },
      },
    ];
    if (req.query.q)
      pipeline.push({
        $match: {
          $or: [
            "testID",
            "participant.userName",
            "participant.email",
            "assessment.testName",
          ].map((field) => ({ [field]: pattern(req.query.q) })),
        },
      });
    pipeline.push(
      { $sort: { endedAt: -1, _id: -1 } },
      {
        $facet: {
          count: [{ $count: "total" }],
          rows: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $project: {
                testID: 1,
                results: 1,
                endedAt: 1,
                "participant._id": 1,
                "participant.userName": 1,
                "participant.email": 1,
                "assessment.testName": 1,
              },
            },
          ],
        },
      },
    );
    const [data] = await Attempts.aggregate(pipeline);
    res.json(
      pageResult(
        data.rows.map((row) => ({
          id: String(row._id),
          testID: row.testID,
          name: row.assessment[0]?.testName || "Assessment",
          participant: person(row.participant[0]),
          score: row.results?.score ?? 0,
          total: row.results?.total ?? 0,
          percentage: row.results?.percentage ?? null,
          incorrect: row.results?.incorrect ?? null,
          unanswered: row.results?.unanswered ?? null,
          finishedAt: row.endedAt,
        })),
        data.count[0]?.total || 0,
        page,
        limit,
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/admin/members", async (req, res, next) => {
  try {
    const [owner, admins, audit] = await Promise.all([
      Users.findOne({
        email: process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase() || "",
      })
        .select("userName email")
        .lean(),
      PlatformAdmin.find()
        .populate("user", "userName email")
        .populate("grantedBy", "userName email")
        .sort({ createdAt: -1 })
        .lean(),
      AdminAudit.find()
        .populate("actor", "userName email")
        .populate("target", "userName email")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);
    res.json({
      role: req.platform.role,
      owner: person(owner),
      admins: admins
        .filter(
          (admin) =>
            admin.user && String(admin.user._id) !== String(owner?._id),
        )
        .map((admin) => ({
          ...person(admin.user),
          grantedBy: person(admin.grantedBy),
          createdAt: admin.createdAt,
        })),
      audit: audit.map((item) => ({
        id: String(item._id),
        actor: person(item.actor),
        target: person(item.target),
        action: item.action,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/admin/members", ownerOnly, async (req, res, next) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    if (!email || email.length > 254)
      return res
        .status(400)
        .json({ error: "Enter an existing account email." });
    const target = await Users.findOne({ email }).select("userName email");
    if (!target)
      return res
        .status(404)
        .json({
          error: "No account found. Ask this person to register first.",
        });
    if (target.email === process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase())
      return res
        .status(409)
        .json({ error: "This account is already the platform owner." });
    const admin = await PlatformAdmin.create({
      user: target._id,
      grantedBy: req.platform.user._id,
    });
    try {
      await AdminAudit.create({
        actor: req.platform.user._id,
        target: target._id,
        action: "granted",
      });
    } catch (error) {
      await PlatformAdmin.deleteOne({ _id: admin._id });
      throw error;
    }
    req.activity = { action: 'platform.admin_granted', targetUser: target._id };
    res.status(201).json({ ...person(target), role: "admin" });
  } catch (error) {
    if (error.code === 11000)
      return res
        .status(409)
        .json({ error: "This account is already a platform admin." });
    next(error);
  }
});

router.delete("/admin/members/:id", ownerOnly, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ error: "Invalid account." });
    const target = await Users.findById(req.params.id).select("email");
    if (
      target?.email === process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase()
    )
      return res
        .status(400)
        .json({ error: "The configured owner cannot be removed." });
    const admin = await PlatformAdmin.findOneAndDelete({ user: req.params.id });
    if (!admin)
      return res
        .status(404)
        .json({ error: "Admin access was already removed." });
    await AdminAudit.create({
      actor: req.platform.user._id,
      target: req.params.id,
      action: "revoked",
    });
    req.activity = { action: 'platform.admin_revoked', targetUser: req.params.id };
    res.json({ removed: true });
  } catch (error) {
    next(error);
  }
});
export default router;
