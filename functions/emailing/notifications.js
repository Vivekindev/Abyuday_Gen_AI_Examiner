import EmailOutbox from '../../models/emailOutbox.js';
import Users from '../../models/usersData.js';
import Team from '../../models/team.js';
import Tasks from '../../models/pendingTasksDB.js';
import { difficultyLabel } from '../../shared/difficulty.js';
import { emailEnabled } from './transport.js';
import { sealPayload } from './payload.js';

export async function queueEmail({ key, event, category, email, user = null, team = null, testID, invite = null, requiresMembership = true, requiredRoles = [], payload }) {
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return false;
  const recipient = email.trim().toLowerCase();
  await EmailOutbox.updateOne({ key: `${key}:${recipient}` }, { $setOnInsert: { event, category, email: recipient, user, team, testID, invite, requiresMembership, requiredRoles, payload: sealPayload(payload) } }, { upsert: true });
  return true;
}

async function queueForUsers(userIds, notification) {
  const users = await Users.find({ _id: { $in: [...new Set(userIds.map(String))] } }).select('email userName emailPreferences').lean();
  for (const user of users) {
    if (user.emailPreferences?.[notification.category] === false) continue;
    await queueEmail({ ...notification, email: user.email, user: user._id, payload: { ...notification.payload, name: user.userName || 'there' } });
  }
}

// Notification failures never turn an already successful product action into an error.
async function safelyQueue(action) {
  try { await action(); return emailEnabled() ? 'queued' : 'disabled'; }
  catch (error) { console.error('Could not queue notification:', { code: error.code || 'QUEUE_ERROR' }); return 'failed'; }
}

export function notifyInvite(invite, token, team, actor) {
  return safelyQueue(() => queueEmail({
    key: `invite:${invite.id}`, event: 'invite.created', category: 'invitation', email: invite.email, team: team._id, invite: invite._id,
    payload: {
      title: `You're invited to ${team.name}`,
      heading: 'You’re invited to join a team',
      preheader: `${actor.userName || actor.email} invited you to ${team.name} on Abyuday.`,
      message: `${actor.userName || actor.email} invited you to collaborate and take assessments with their team on Abyuday.`,
      details: [['Team', team.name], ['Your role', invite.role === 'admin' ? 'Admin' : 'Member']],
      actionLabel: 'Accept invitation', actionPath: `/join?token=${encodeURIComponent(token)}`,
      note: `Sign in or create an account with ${invite.email}. This invitation expires in 7 days. If you weren’t expecting it, you can ignore this email.`,
      preferences: false,
    },
  }));
}

export function notifyGeneration(task, ready) {
  return safelyQueue(async () => {
    const team = task.team ? await Team.findOne({ _id: task.team, deletingAt: null }) : null;
    if (task.team && !team) return;
    const recipients = [task.user, ...(team?.members || []).filter((member) => ready || ['owner', 'admin'].includes(member.role)).map((member) => member.user)];
    await queueForUsers(recipients, {
      key: `generation:${task.testID}:${task.generationAttempt || 0}:${ready ? 'ready' : 'failed'}`,
      event: ready ? 'generation.completed' : 'generation.failed', category: 'generation', team: task.team, testID: task.testID,
      payload: {
        title: ready ? `Assessment ready: ${task.testName}` : `Assessment generation failed: ${task.testName}`,
        heading: ready ? 'Your assessment is ready' : 'Assessment generation didn’t finish',
        preheader: ready ? `${task.testName} is ready to take.` : `Review ${task.testName} and retry generation.`,
        message: ready ? 'Generation is complete. Open the assessment whenever you’re ready to begin.' : 'We couldn’t complete generation. Review the assessment status and try again.',
        details: [['Assessment', task.testName], ['Difficulty', difficultyLabel(task.testDifficulty)], ['Questions', task.questionCount], ...(team ? [['Team', team.name]] : [])],
        actionLabel: ready ? 'Open assessment' : 'Review assessment', actionPath: `/dashboard/take?testID=${encodeURIComponent(task.testID)}`,
      },
    });
    await Tasks.updateOne({ _id: task._id, status: ready ? 'Done' : 'Error', generationAttempt: task.generationAttempt || 0 }, { $set: { generationNotificationPending: false } });
  });
}

export function notifyTeamEvent({ team, actor, event, eventId, title, message, recipients, adminsOnly = false, requiresMembership = true, actionPath }) {
  return safelyQueue(async () => {
    const ids = recipients || team.members.filter((member) => (!adminsOnly || ['owner', 'admin'].includes(member.role)) && String(member.user) !== String(actor._id)).map((member) => member.user);
    await queueForUsers(ids, {
      key: `${event}:${eventId || `${team.id}:${team.__v}`}`, event, category: 'team', team: event === 'team.deleted' ? null : team._id, requiresMembership, requiredRoles: adminsOnly ? ['owner', 'admin'] : [],
      payload: {
        title,
        heading: {
          'team.joined': 'A teammate joined',
          'team.deleted': 'Team deleted',
          'assessment.requested': 'New assessment request',
          'assessment.request_updated': 'Your assessment request was updated',
          'team.ownership_transferred': 'Team ownership updated',
          'member.role_changed': 'Your team role changed',
          'team.left': 'Team membership updated',
          'member.removed': 'Team membership updated',
          'member.removed_notice': 'Your team access changed',
        }[event] || title,
        message, details: [['Team', team.name]],
        actionLabel: ['team.deleted', 'member.removed_notice'].includes(event) ? 'Open teams' : event.startsWith('assessment.request') ? 'View request' : 'View team',
        actionPath: actionPath || (event === 'team.deleted' ? '/dashboard/teams' : `/dashboard/teams?team=${team.id}`),
      },
    });
  });
}

export async function cancelPendingEmails(filter) {
  await EmailOutbox.updateMany({ ...filter, status: { $in: ['pending', 'processing', 'failed'] } }, { $set: { status: 'cancelled' }, $unset: { payload: 1, leaseToken: 1, leasedUntil: 1 } });
}
