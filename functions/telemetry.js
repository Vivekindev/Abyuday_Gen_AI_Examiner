import mongoose from "mongoose";
import {
  Activity,
  AiUsage,
  ApiUsage,
  MonitoringState,
} from "../models/telemetry.js";

const pending = new Set();
let writeFailures = 0;
let initialization;
let database;
export const telemetryHealth = () => ({ writeFailures });
export async function initializeMonitoring() {
  if (database !== mongoose.connection.name) {
    database = mongoose.connection.name;
    initialization = null;
  }
  if (!initialization)
    initialization = MonitoringState.findOneAndUpdate(
      { _id: "tracking" },
      { $setOnInsert: { startedAt: new Date() } },
      { upsert: true, new: true },
    )
      .lean()
      .exec()
      .catch((error) => {
        initialization = null;
        throw error;
      });
  return initialization;
}
export function trackWrite(promise) {
  const safe = promise.catch((error) => {
    if (error.code !== 11000) {
      writeFailures++;
      console.error("Monitoring write failed:", error.code || error.name);
    }
  });
  pending.add(safe);
  safe.finally(() => pending.delete(safe));
  return safe;
}
export const flushTelemetry = async () => {
  await Promise.all([...pending]);
};
export const recordActivity = (event) => trackWrite(Activity.create(event));
export const workerHeartbeat = (fields) =>
  trackWrite(
    MonitoringState.updateOne(
      { _id: "worker" },
      { $set: fields },
      { upsert: true },
    ),
  );

export function monitorRequests(req, res, next) {
  // Monitoring's own polling is excluded from product traffic counts.
  if (/\/monitoring(?:\/|$)/.test(req.path)) return next();
  const startedAt = new Date();
  const started = performance.now();
  res.once("finish", () => {
    if (mongoose.connection.readyState !== 1) return;
    const user = req.user?.id || req.currentUser?._id || null;
    trackWrite(
      ApiUsage.create({
        user,
        team: req.monitoringTeam || null,
        method: req.method,
        // Route templates only: no URLs, query strings, cookies, or request bodies.
        route:
          typeof req.route?.path === "string" ? req.route.path : "(unmatched)",
        status: res.statusCode,
        durationMs: Math.max(0, Math.round(performance.now() - started)),
        createdAt: startedAt,
      }),
    );
    if (req.activity && res.statusCode < 400)
      recordActivity({
        user,
        team: req.monitoringTeam || null,
        ...req.activity,
      });
  });
  next();
}

export function tokenMetadata(metadata) {
  const value = (key) =>
    Number.isSafeInteger(metadata?.[key]) && metadata[key] >= 0
      ? metadata[key]
      : null;
  return {
    promptTokens: value("promptTokenCount"),
    outputTokens: value("candidatesTokenCount"),
    thinkingTokens: value("thoughtsTokenCount"),
    cachedTokens: value("cachedContentTokenCount"),
    toolTokens: value("toolUsePromptTokenCount"),
    totalTokens: value("totalTokenCount"),
  };
}

export async function meteredGeneration({
  context,
  model,
  operation,
  agent,
  execute,
  validate,
}) {
  if (!mongoose.isValidObjectId(context?.user))
    throw new Error("Generation requires a user attribution.");
  // Persist intent before the chargeable call. A telemetry update must never cause a paid call to be retried.
  const record = await AiUsage.create({
    user: context.user,
    team: context.team || null,
    testID: context.testID,
    model,
    operation,
    agent,
  });
  const start = performance.now();
  let response;
  let failure;
  try {
    response = await execute();
    if (validate) validate(response);
    return response;
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    const status = Number.isInteger(failure?.status)
      ? failure.status
      : response
        ? 200
        : null;
    await trackWrite(
      AiUsage.updateOne(
        { _id: record._id },
        {
          $set: {
            ...tokenMetadata(response?.usageMetadata),
            status: failure ? "failed" : "success",
            finishedAt: new Date(),
            durationMs: Math.max(0, Math.round(performance.now() - start)),
            modelVersion:
              typeof response?.modelVersion === "string"
                ? response.modelVersion.slice(0, 100)
                : undefined,
            finishReason: String(
              response?.candidates?.[0]?.finishReason || "",
            ).slice(0, 80),
            httpStatus: status,
            errorCode: failure
              ? response
                ? "INVALID_RESPONSE"
                : status === 429
                  ? "RATE_LIMITED"
                  : status >= 500
                    ? "PROVIDER_UNAVAILABLE"
                    : "REQUEST_FAILED"
              : undefined,
            validationMessage: failure?.generationValidation ? String(failure.message).slice(0, 1200) : undefined,
          },
        },
      ),
    );
  }
}
