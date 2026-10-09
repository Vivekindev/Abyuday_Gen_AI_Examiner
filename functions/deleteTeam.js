import crypto from 'node:crypto';
import Team from '../models/team.js';
import TeamInvite from '../models/teamInvite.js';
import TeamAssessmentRequest from '../models/teamAssessmentRequest.js';
import Tasks from '../models/pendingTasksDB.js';
import Generated from '../models/generatedTests.js';
import Attempts from '../models/testWindow.js';
import { AssessmentEngine, EngineRequest } from '../models/assessmentEngine.js';
import { cancelPendingEmails } from './emailing/notifications.js';

const conflict = (message) => Object.assign(new Error(message), { status: 409 });

// A retry can finish interrupted cleanup on standalone MongoDB as well as replica sets.
// Keep the team and task IDs until their dependants have been removed.
export async function deleteTeam(team, ownerId) {
  const token = crypto.randomUUID();
  const now = new Date();
  const claimed = await Team.findOneAndUpdate({
    _id: team._id,
    members: { $elemMatch: { user: ownerId, role: 'owner' } },
    $or: [{ deletionLeaseUntil: null }, { deletionLeaseUntil: { $lte: now } }],
  }, {
    $set: { deletingAt: team.deletingAt || now, deletionToken: token, deletionLeaseUntil: new Date(now.getTime() + 5 * 60_000) },
    $inc: { __v: 1 },
  }, { new: true });
  if (!claimed) throw conflict('Team deletion is already running, or your ownership has changed. Refresh and try again shortly.');

  const claim = { _id: team._id, deletionToken: token };
  let finished = false;
  try {
    if (await Tasks.exists({ team: team._id, status: 'Processing' })) {
      if (!team.deletingAt) await Team.updateOne(claim, { $set: { deletingAt: null } });
      throw conflict('An assessment is being generated for this team. Wait for generation to finish, then delete the team.');
    }
    const tasks = await Tasks.find({ team: team._id }).select('testID').lean();
    const generated = await Generated.find({ team: team._id }).select('testID').lean();
    const testIDs = [...new Set([...tasks, ...generated].map((test) => test.testID))];
    const related = { $or: [{ team: team._id }, { testID: { $in: testIDs } }] };
    await cancelPendingEmails({ team: team._id });

    await Attempts.deleteMany({ testID: { $in: testIDs } });
    await EngineRequest.deleteMany(related);
    await AssessmentEngine.deleteMany({ team: team._id });
    await Generated.deleteMany(related);
    await TeamAssessmentRequest.deleteMany({ team: team._id });
    await TeamInvite.deleteMany({ team: team._id });
    await Tasks.deleteMany({ team: team._id });
    const removed = await Team.deleteOne(claim);
    if (!removed.deletedCount) throw conflict('Deletion could not finish. Refresh the team and retry.');
    finished = true;
  } finally {
    // Retain deletingAt after partial cleanup, so members cannot use incomplete data.
    // The owner can retry; a crashed process releases its claim when the lease expires.
    if (!finished) await Team.updateOne(claim, { $set: { deletionToken: null, deletionLeaseUntil: null } });
  }
}
