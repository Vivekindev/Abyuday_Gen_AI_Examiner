import mongoose from "mongoose";

const ref = (model, required = false) => ({
  type: mongoose.Schema.Types.ObjectId,
  ref: model,
  required,
  default: null,
});
const count = { type: Number, min: 0, default: null };
const aiSchema = new mongoose.Schema({
  user: ref("usersData", true),
  team: ref("Team"),
  testID: { type: String, maxlength: 64 },
  operation: {
    type: String,
    enum: ["questions", "explanation"],
    required: true,
  },
  model: { type: String, required: true },
  modelVersion: String,
  status: {
    type: String,
    enum: ["in_progress", "success", "failed"],
    default: "in_progress",
  },
  startedAt: { type: Date, default: Date.now },
  finishedAt: Date,
  durationMs: count,
  promptTokens: count,
  outputTokens: count,
  thinkingTokens: count,
  cachedTokens: count,
  toolTokens: count,
  totalTokens: count,
  httpStatus: Number,
  errorCode: String,
  finishReason: String,
});
aiSchema.index({ startedAt: -1 });
aiSchema.index({ user: 1, startedAt: -1 });
aiSchema.index({ team: 1, startedAt: -1, user: 1 });
export const AiUsage = mongoose.model("AiUsage", aiSchema);

const activitySchema = new mongoose.Schema({
  user: ref("usersData"),
  team: ref("Team"),
  action: { type: String, required: true, maxlength: 80 },
  testID: { type: String, maxlength: 64 },
  targetUser: ref("usersData"),
  role: { type: String, enum: ["owner", "admin", "member"] },
  source: { type: String, enum: ["user", "system"], default: "user" },
  eventKey: { type: String },
  createdAt: { type: Date, default: Date.now },
});
activitySchema.index({ eventKey: 1 }, { unique: true, sparse: true });
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 86400 });
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ team: 1, createdAt: -1, user: 1 });
export const Activity = mongoose.model("Activity", activitySchema);

const requestSchema = new mongoose.Schema({
  user: ref("usersData"),
  team: ref("Team"),
  method: String,
  route: String,
  status: Number,
  durationMs: { type: Number, min: 0 },
  createdAt: { type: Date, default: Date.now },
});
requestSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 86400 });
requestSchema.index({ user: 1, createdAt: -1 });
requestSchema.index({ team: 1, createdAt: -1, user: 1 });
export const ApiUsage = mongoose.model("ApiUsage", requestSchema);

const stateSchema = new mongoose.Schema({
  _id: String,
  startedAt: Date,
  lastPollAt: Date,
  lastCompletedAt: Date,
  workerStatus: { type: String, enum: ["idle", "processing", "error"] },
  currentTestID: String,
});
export const MonitoringState = mongoose.model("MonitoringState", stateSchema);
