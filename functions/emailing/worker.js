import crypto from 'node:crypto';
import EmailOutbox from '../../models/emailOutbox.js';
import Users from '../../models/usersData.js';
import Team from '../../models/team.js';
import TeamInvite from '../../models/teamInvite.js';
import Tasks from '../../models/pendingTasksDB.js';
import { applicationUrl, createMailTransport, emailEnabled } from './transport.js';
import { renderNotification } from './templates.js';
import { notifyGeneration } from './notifications.js';
import { openPayload } from './payload.js';

const MAX_ATTEMPTS = 6;
let running = false;
let transport;

async function stillRelevant(mail) {
  if (mail.user) {
    const user = await Users.findById(mail.user).select('email emailPreferences');
    if (!user || user.email !== mail.email || user.emailPreferences?.[mail.category] === false) return false;
  }
  if (mail.team) {
    const team = await Team.findOne({ _id: mail.team, deletingAt: null });
    const member = team?.members.find((item) => String(item.user) === String(mail.user));
    if (!team || (mail.requiresMembership && mail.user && !member) || (mail.requiredRoles.length && !mail.requiredRoles.includes(member?.role))) return false;
  }
  if (mail.invite && !await TeamInvite.exists({ _id: mail.invite, email: mail.email, usedAt: null, expiresAt: { $gt: new Date() } })) return false;
  if (mail.testID) {
    const task = await Tasks.findOne({ testID: mail.testID }).select('status generationAttempt user');
    if (!task || (mail.event === 'generation.completed' ? task.status !== 'Done' : task.status !== 'Error')) return false;
    if (mail.key.split(':')[2] !== String(task.generationAttempt || 0)) return false;
    if (mail.team && mail.event === 'generation.failed' && String(mail.user) !== String(task.user)) {
      const team = await Team.findOne({ _id: mail.team, deletingAt: null });
      if (!team?.members.some((member) => String(member.user) === String(mail.user) && ['owner', 'admin'].includes(member.role))) return false;
    }
  }
  return true;
}

export async function deliverNextEmail(sender) {
  const now = new Date();
  const leaseToken = crypto.randomUUID();
  const mail = await EmailOutbox.findOneAndUpdate({
    expiresAt: { $gt: now },
    $or: [{ status: 'pending', nextAttemptAt: { $lte: now } }, { status: 'processing', leasedUntil: { $lte: now } }],
  }, { $set: { status: 'processing', leaseToken, leasedUntil: new Date(Date.now() + 120_000) }, $inc: { attempts: 1 } }, { new: true, sort: { createdAt: 1 } }).select('+payload');
  if (!mail) return false;
  const claim = { _id: mail._id, status: 'processing', leaseToken };
  try {
    if (!mail.payload || !await stillRelevant(mail)) {
      await EmailOutbox.updateOne(claim, { $set: { status: 'cancelled' }, $unset: { payload: 1, leaseToken: 1, leasedUntil: 1 } });
      return true;
    }
    const content = renderNotification(openPayload(mail.payload), applicationUrl());
    const messageId = `<${crypto.createHash('sha256').update(mail.key).digest('hex')}@abyuday.notifications>`;
    await sender.sendMail({ from: process.env.SMTP_FROM || { name: 'Abyuday', address: process.env.SMTP_USER }, to: mail.email, messageId, ...content });
    await EmailOutbox.updateOne(claim, { $set: { status: 'sent', sentAt: new Date() }, $unset: { payload: 1, lastError: 1, leaseToken: 1, leasedUntil: 1 } });
  } catch (error) {
    const terminal = mail.attempts >= MAX_ATTEMPTS;
    const code = String(error.code || 'DELIVERY_ERROR').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
    await EmailOutbox.updateOne(claim, {
      $set: { status: terminal ? 'failed' : 'pending', lastError: code, nextAttemptAt: new Date(Date.now() + Math.min(60 * 60_000, 60_000 * 2 ** (mail.attempts - 1))) },
      $unset: { leaseToken: 1, leasedUntil: 1 },
    });
    console.error('Email delivery deferred:', { code, attempts: mail.attempts, terminal });
  }
  return true;
}

export async function flushEmailQueue() {
  if (running || !emailEnabled()) return;
  running = true;
  try {
    const completed = await Tasks.find({ generationNotificationPending: true, status: { $in: ['Done', 'Error'] } }).limit(20);
    for (const task of completed) await notifyGeneration(task, task.status === 'Done');
    transport ||= createMailTransport();
    for (let index = 0; index < 5; index += 1) if (!await deliverNextEmail(transport)) break;
  } catch (error) { console.error('Email worker unavailable:', { code: error.code || 'WORKER_ERROR' }); }
  finally { running = false; }
}

export default function startEmailWorker() {
  void flushEmailQueue();
  return setInterval(() => { void flushEmailQueue(); }, 10_000);
}
