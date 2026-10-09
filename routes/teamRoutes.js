import { Router } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { authenticateToken } from '../functions/authFunctions.js';
import findUser from '../functions/findUser.js';
import { canManageTeam, getTeamMembership } from '../functions/teamAccess.js';
import Team from '../models/team.js';
import TeamInvite from '../models/teamInvite.js';
import pendingTasksDB from '../models/pendingTasksDB.js';
import testWindow from '../models/testWindow.js';
import TeamAssessmentRequest from '../models/teamAssessmentRequest.js';
import { deleteTeam } from '../functions/deleteTeam.js';
import { difficultyRating } from '../shared/difficulty.js';
import { cancelPendingEmails, notifyInvite, notifyTeamEvent } from '../functions/emailing/notifications.js';
import EmailOutbox from '../models/emailOutbox.js';
import { emailDeliveryStatus } from '../functions/emailing/deliveryStatus.js';

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

router.use('/teams', authenticateToken, async (req, res, next) => {
  try {
    req.currentUser = await findUser(req.user.email);
    if (!req.currentUser) return res.sendStatus(401);
    next();
  } catch (error) { next(error); }
});

router.get('/teams', async (req, res, next) => {
  try {
    const teams = await Team.find({ 'members.user': req.currentUser._id }).sort({ updatedAt: -1 });
    res.json(teams.filter((team) => !team.deletingAt || team.members.some((member) => String(member.user) === req.currentUser.id && member.role === 'owner')).map((team) => ({
      id: team.id,
      name: team.name,
      role: team.members.find((member) => String(member.user) === req.currentUser.id).role,
      memberCount: team.members.length,
      deleting: !!team.deletingAt,
    })));
  } catch (error) { next(error); }
});

router.post('/teams', async (req, res, next) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'Team name must be 2 to 80 characters.' });
    if (await Team.countDocuments({ 'members.user': req.currentUser._id }) >= 10) {
      return res.status(409).json({ error: 'The ten-team limit has been reached.' });
    }
    const team = await Team.create({ name, members: [{ user: req.currentUser._id, role: 'owner' }] });
    req.monitoringTeam = team._id;
    req.activity = { action: 'team.created' };
    res.status(201).json({ id: team.id, name: team.name, role: 'owner', memberCount: 1 });
  } catch (error) { next(error); }
});

router.get('/teams/invites/:token', async (req, res, next) => {
  try {
    const invite = await TeamInvite.findOne({ tokenHash: hashToken(req.params.token), usedAt: null, expiresAt: { $gt: new Date() } }).populate('team', 'name deletingAt');
    if (!invite || !invite.team || invite.team.deletingAt) return res.status(404).json({ error: 'Invite is invalid or expired.' });
    res.json({ teamName: invite.team.name, email: invite.email, role: invite.role, expiresAt: invite.expiresAt });
  } catch (error) { next(error); }
});

router.post('/teams/invites/:token/accept', async (req, res, next) => {
  try {
    const invite = await TeamInvite.findOne({ tokenHash: hashToken(req.params.token), usedAt: null, expiresAt: { $gt: new Date() } });
    if (!invite) return res.status(404).json({ error: 'Invite is invalid or expired.' });
    if (invite.email !== req.currentUser.email) return res.status(403).json({ error: 'Sign in with the invited email address.' });
    const joined = await Team.updateOne(
      { _id: invite.team, deletingAt: null, 'members.user': { $ne: req.currentUser._id } },
      { $push: { members: { user: req.currentUser._id, role: invite.role, joinedAt: new Date() } } },
    );
    const team = await Team.findById(invite.team);
    if (!team || team.deletingAt) return res.status(404).json({ error: 'This team is no longer available.' });
    invite.usedAt = new Date();
    await invite.save();
    await cancelPendingEmails({ invite: invite._id });
    req.monitoringTeam = team._id;
    if (joined.modifiedCount) {
      req.activity = { action: 'team.joined', role: invite.role };
      await notifyTeamEvent({ team, actor: req.currentUser, event: 'team.joined', eventId: invite.id, title: `${req.currentUser.userName || 'A member'} joined ${team.name}`, message: `${req.currentUser.userName || 'A new member'} accepted an invitation to ${team.name} as ${invite.role}.`, recipients: [...team.members.filter((member) => ['owner', 'admin'].includes(member.role)).map((member) => member.user), req.currentUser._id] });
    }
    res.json({ id: team.id, name: team.name });
  } catch (error) { next(error); }
});

router.get('/teams/:teamId', async (req, res, next) => {
  try {
    const membership = await getTeamMembership(req.params.teamId, req.currentUser._id, { allowDeleting: true });
    if (!membership) return res.sendStatus(404);
    req.monitoringTeam = membership.team._id;
    await membership.team.populate('members.user', 'email userName');
    res.json({
      id: membership.team.id, name: membership.team.name, role: membership.role, deleting: !!membership.team.deletingAt,
      members: membership.team.members.map(({ user, role, joinedAt }) => ({
        id: user.id, email: user.email, name: user.userName, role, joinedAt,
      })),
    });
  } catch (error) { next(error); }
});

router.delete('/teams/:teamId', async (req, res, next) => {
  try {
    const membership = await getTeamMembership(req.params.teamId, req.currentUser._id, { allowDeleting: true });
    if (!membership) return res.status(404).json({ error: 'Team not found.' });
    if (membership.role !== 'owner') return res.status(403).json({ error: 'Only the team owner can delete this team.' });
    if (typeof req.body?.confirmationName !== 'string' || req.body.confirmationName !== membership.team.name) {
      return res.status(400).json({ error: 'Enter the team name exactly to confirm deletion.' });
    }
    req.monitoringTeam = membership.team._id;
    await deleteTeam(membership.team, req.currentUser._id);
    await notifyTeamEvent({ team: membership.team, actor: req.currentUser, event: 'team.deleted', eventId: membership.team.id, title: `Team deleted: ${membership.team.name}`, message: `${membership.team.name} was deleted by its owner. Its assessments and team records are no longer available.`, requiresMembership: false });
    req.activity = { action: 'team.deleted' };
    res.sendStatus(204);
  } catch (error) {
    if (error.status === 409) return res.status(409).json({ error: error.message });
    next(error);
  }
});

router.get('/teams/:teamId/results', async (req, res, next) => {
  try {
    const membership = await getTeamMembership(req.params.teamId, req.currentUser._id);
    if (!membership) return res.sendStatus(404);
    req.monitoringTeam = membership.team._id;
    const tests = await pendingTasksDB.find({ team: membership.team._id }).select('testID testName');
    const names = new Map(tests.map((test) => [test.testID, test.testName]));
    const attempts = await testWindow.find({ testID: { $in: [...names.keys()] }, isEnded: true })
      .populate('user', 'userName email').sort({ startTime: -1 }).limit(100);
    req.activity = { action: 'results.viewed' };
    res.json(attempts.map((attempt) => ({
      id: attempt.id, testID: attempt.testID, testName: names.get(attempt.testID),
      name: attempt.user?.userName || 'User', email: attempt.user?.email || '',
      score: attempt.results?.score ?? 0, total: attempt.results?.total ?? 0,
      percentage: attempt.results?.percentage ?? 0,
      incorrect: attempt.results?.incorrect ?? null,
      unanswered: attempt.results?.unanswered ?? null,
      memberId: attempt.user?.id || null,
      finishedAt: attempt.endedAt || attempt.expiryTime,
    })));
  } catch (error) { next(error); }
});

router.get('/teams/:teamId/assessment-requests', async (req, res, next) => {
  try {
    const membership = await getTeamMembership(req.params.teamId, req.currentUser._id);
    if (!membership) return res.sendStatus(404);
    req.monitoringTeam = membership.team._id;
    const requests = await TeamAssessmentRequest.find({ team: membership.team._id })
      .populate('requestedBy', 'userName email').populate('handledBy', 'userName email')
      .sort({ createdAt: -1 }).limit(100).lean();
    res.json(requests.map((item) => ({
      id: String(item._id), title: item.title, topic: item.topic,
      questionCount: item.questionCount, difficulty: item.difficulty, status: item.status,
      requestedBy: { id: String(item.requestedBy?._id || ''), name: item.requestedBy?.userName || 'Member', email: item.requestedBy?.email || '' },
      handledBy: item.handledBy ? { name: item.handledBy.userName || 'Admin', email: item.handledBy.email } : null,
      createdAt: item.createdAt, updatedAt: item.updatedAt,
    })));
  } catch (error) { next(error); }
});

router.post('/teams/:teamId/assessment-requests', async (req, res, next) => {
  try {
    const membership = await getTeamMembership(req.params.teamId, req.currentUser._id);
    if (!membership) return res.sendStatus(404);
    req.monitoringTeam = membership.team._id;
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
    const questionCount = Number(req.body?.questionCount);
    const difficulty = difficultyRating(req.body?.difficulty);
    if (title.length < 2 || title.length > 80 || topic.length < 8 || topic.length > 2000 ||
      !Number.isInteger(questionCount) || questionCount < 1 || questionCount > 50 ||
      difficulty === null) {
      return res.status(400).json({ error: 'Enter a title, topic, 1–50 questions, and a valid difficulty.' });
    }
    if (await TeamAssessmentRequest.countDocuments({ team: membership.team._id, requestedBy: req.currentUser._id, status: { $in: ['open', 'in_progress'] } }) >= 5) {
      return res.status(409).json({ error: 'You already have five active requests for this team.' });
    }
    const request = await TeamAssessmentRequest.create({ team: membership.team._id, requestedBy: req.currentUser._id, title, topic, questionCount, difficulty });
    if (!await Team.exists({ _id: membership.team._id, deletingAt: null })) {
      await TeamAssessmentRequest.deleteOne({ _id: request._id });
      return res.status(409).json({ error: 'This team is being deleted.' });
    }
    req.activity = { action: 'assessment.requested' };
    await notifyTeamEvent({ team: membership.team, actor: req.currentUser, event: 'assessment.requested', eventId: request.id, adminsOnly: true, title: `Assessment requested: ${title}`, message: `${req.currentUser.userName || 'A team member'} requested ${title} with ${questionCount} questions. Review the request to accept it or create an assessment.`, actionPath: `/dashboard/teams?team=${membership.team.id}&tab=requests` });
    res.status(201).json({ id: String(request._id), status: request.status });
  } catch (error) { next(error); }
});

router.patch('/teams/:teamId/assessment-requests/:requestId', async (req, res, next) => {
  try {
    const membership = await getTeamMembership(req.params.teamId, req.currentUser._id);
    if (!membership) return res.sendStatus(404);
    req.monitoringTeam = membership.team._id;
    if (!canManageTeam(membership.role)) return res.sendStatus(403);
    if (!mongoose.isValidObjectId(req.params.requestId)) return res.sendStatus(404);
    const status = req.body?.status;
    if (!['in_progress', 'fulfilled', 'declined'].includes(status)) return res.status(400).json({ error: 'Choose a valid request status.' });
    const request = await TeamAssessmentRequest.findOneAndUpdate(
      { _id: req.params.requestId, team: membership.team._id, status: { $in: ['open', 'in_progress'] } },
      { $set: { status, handledBy: req.currentUser._id } }, { new: true },
    );
    if (!request) return res.status(404).json({ error: 'This request is no longer open.' });
    req.activity = { action: 'assessment.request_updated', status };
    const label = { in_progress: 'accepted', fulfilled: 'completed', declined: 'declined' }[status];
    await notifyTeamEvent({ team: membership.team, actor: req.currentUser, event: 'assessment.request_updated', eventId: `${request.id}:${status}`, recipients: [request.requestedBy], title: `Assessment request ${label}: ${request.title}`, message: `${req.currentUser.userName || 'A team admin'} ${label} your request for ${request.title}.`, actionPath: `/dashboard/teams?team=${membership.team.id}&tab=requests` });
    res.json({ id: String(request._id), status: request.status });
  } catch (error) { next(error); }
});

router.post('/teams/:teamId/invites', async (req, res, next) => {
  try {
    const membership = await getTeamMembership(req.params.teamId, req.currentUser._id);
    if (!membership) return res.sendStatus(404);
    req.monitoringTeam = membership.team._id;
    if (!canManageTeam(membership.role)) return res.sendStatus(403);
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const role = req.body?.role || 'member';
    if (!emailPattern.test(email) || email.length > 254 || !['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Enter a valid email and role.' });
    }
    if (membership.team.members.length >= 100) return res.status(409).json({ error: 'Team member limit reached.' });
    if (await TeamInvite.countDocuments({ team: membership.team._id, usedAt: null, expiresAt: { $gt: new Date() } }) >= 100) {
      return res.status(409).json({ error: 'Too many outstanding invitations.' });
    }
    const invitedUser = await findUser(email);
    if (invitedUser && membership.team.members.some((member) => String(member.user) === invitedUser.id)) {
      return res.status(409).json({ error: 'This person is already a member.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const invite = await TeamInvite.create({
      team: membership.team._id, email, role, tokenHash: hashToken(token),
      invitedBy: req.currentUser._id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    if (!await Team.exists({ _id: membership.team._id, deletingAt: null })) {
      await TeamInvite.deleteOne({ _id: invite._id });
      return res.status(409).json({ error: 'This team is being deleted.' });
    }
    req.activity = { action: 'invite.created', role, targetUser: invitedUser?._id };
    const emailStatus = await notifyInvite(invite, token, membership.team, req.currentUser);
    res.status(201).json({ id: invite.id, token, email: invite.email, expiresAt: invite.expiresAt, emailStatus });
  } catch (error) { next(error); }
});

router.get('/teams/:teamId/invites', async (req, res, next) => {
  try {
    const membership = await getTeamMembership(req.params.teamId, req.currentUser._id);
    if (!membership) return res.sendStatus(404);
    req.monitoringTeam = membership.team._id;
    if (!canManageTeam(membership.role)) return res.sendStatus(403);
    const invites = await TeamInvite.find({ team: membership.team._id, usedAt: null, expiresAt: { $gt: new Date() } })
      .select('email role expiresAt').sort({ createdAt: -1 }).limit(100);
    const emails = await EmailOutbox.find({ invite: { $in: invites.map((invite) => invite._id) } }).select('invite status attempts sentAt nextAttemptAt');
    const mailByInvite = new Map(emails.map((mail) => [String(mail.invite), mail]));
    res.json(invites.map((invite) => ({
      id: invite.id, email: invite.email, role: invite.role, expiresAt: invite.expiresAt,
      ...emailDeliveryStatus(mailByInvite.get(invite.id)),
    })));
  } catch (error) { next(error); }
});

router.get('/teams/:teamId/invites/:inviteId/delivery', async (req, res, next) => {
  try {
    const membership = await getTeamMembership(req.params.teamId, req.currentUser._id);
    if (!membership) return res.sendStatus(404);
    req.monitoringTeam = membership.team._id;
    if (!canManageTeam(membership.role)) return res.sendStatus(403);
    if (!mongoose.isValidObjectId(req.params.inviteId)) return res.sendStatus(404);
    const invite = await TeamInvite.findOne({ _id: req.params.inviteId, team: membership.team._id }).select('usedAt expiresAt');
    if (!invite) return res.status(404).json({ error: 'This invitation is no longer available.' });
    const mail = await EmailOutbox.findOne({ invite: invite._id, team: membership.team._id }).select('status attempts sentAt nextAttemptAt');
    res.set('Cache-Control', 'no-store').json({
      ...emailDeliveryStatus(mail),
      invitationStatus: invite.usedAt ? 'accepted' : invite.expiresAt <= new Date() ? 'expired' : 'pending',
    });
  } catch (error) { next(error); }
});

router.delete('/teams/:teamId/invites/:inviteId', async (req, res, next) => {
  try {
    const membership = await getTeamMembership(req.params.teamId, req.currentUser._id);
    if (!membership) return res.sendStatus(404);
    req.monitoringTeam = membership.team._id;
    if (!canManageTeam(membership.role)) return res.sendStatus(403);
    if (!mongoose.isValidObjectId(req.params.inviteId)) return res.sendStatus(404);
    const removed = await TeamInvite.deleteOne({ _id: req.params.inviteId, team: membership.team._id, usedAt: null });
    await cancelPendingEmails({ invite: req.params.inviteId });
    if (removed.deletedCount) req.activity = { action: 'invite.revoked' };
    res.sendStatus(204);
  } catch (error) { next(error); }
});

router.post('/teams/:teamId/transfer', async (req, res, next) => {
  try {
    const membership = await getTeamMembership(req.params.teamId, req.currentUser._id);
    if (!membership) return res.sendStatus(404);
    req.monitoringTeam = membership.team._id;
    if (membership.role !== 'owner') return res.sendStatus(403);
    const target = membership.team.members.find((member) => String(member.user) === req.body?.userId);
    if (!target || target.role === 'owner') return res.status(400).json({ error: 'Choose another team member.' });
    const owner = membership.team.members.find((member) => String(member.user) === req.currentUser.id);
    owner.role = 'admin';
    target.role = 'owner';
    await membership.team.save();
    req.activity = { action: 'team.ownership_transferred', targetUser: target.user };
    await notifyTeamEvent({ team: membership.team, actor: req.currentUser, event: 'team.ownership_transferred', eventId: crypto.randomUUID(), title: `Ownership updated: ${membership.team.name}`, message: `${req.currentUser.userName || 'The team owner'} transferred ownership of ${membership.team.name}. Open the team to see the updated roles.` });
    res.json({ ownerId: req.body.userId });
  } catch (error) { next(error); }
});

router.patch('/teams/:teamId/members/:userId', async (req, res, next) => {
  try {
    const membership = await getTeamMembership(req.params.teamId, req.currentUser._id);
    if (!membership) return res.sendStatus(404);
    req.monitoringTeam = membership.team._id;
    if (membership.role !== 'owner') return res.sendStatus(403);
    const role = req.body?.role;
    if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role.' });
    const target = membership.team.members.find((member) => String(member.user) === req.params.userId);
    if (!target) return res.sendStatus(404);
    if (target.role === 'owner') return res.status(409).json({ error: 'The owner role cannot be changed.' });
    if (target.role === role) return res.json({ id: req.params.userId, role });
    target.role = role;
    await membership.team.save();
    req.activity = { action: 'member.role_changed', targetUser: target.user, role };
    await notifyTeamEvent({ team: membership.team, actor: req.currentUser, event: 'member.role_changed', eventId: crypto.randomUUID(), recipients: [target.user], title: `Your role changed in ${membership.team.name}`, message: `${req.currentUser.userName || 'The team owner'} changed your role to ${role}.` });
    res.json({ id: req.params.userId, role });
  } catch (error) { next(error); }
});

router.delete('/teams/:teamId/members/:userId', async (req, res, next) => {
  try {
    const membership = await getTeamMembership(req.params.teamId, req.currentUser._id);
    if (!membership) return res.sendStatus(404);
    req.monitoringTeam = membership.team._id;
    const self = req.params.userId === req.currentUser.id;
    if (!self && !canManageTeam(membership.role)) return res.sendStatus(403);
    const target = membership.team.members.find((member) => String(member.user) === req.params.userId);
    if (!target) return res.sendStatus(404);
    if (target.role === 'owner') return res.status(409).json({ error: 'Transfer ownership before leaving.' });
    req.activity = { action: self ? 'team.left' : 'member.removed', targetUser: target.user };
    membership.team.members = membership.team.members.filter((member) => String(member.user) !== req.params.userId);
    await membership.team.save();
    await notifyTeamEvent({ team: membership.team, actor: req.currentUser, event: self ? 'team.left' : 'member.removed', eventId: crypto.randomUUID(), adminsOnly: true, title: `Membership updated: ${membership.team.name}`, message: `${self ? req.currentUser.userName || 'A member' : 'A member'} ${self ? 'left' : 'was removed from'} ${membership.team.name}.` });
    if (!self) await notifyTeamEvent({ team: membership.team, actor: req.currentUser, event: 'member.removed_notice', eventId: crypto.randomUUID(), recipients: [target.user], requiresMembership: false, title: `You were removed from ${membership.team.name}`, message: `${req.currentUser.userName || 'A team admin'} removed you from ${membership.team.name}. You no longer have access to its assessments.`, actionPath: '/dashboard/teams' });
    res.sendStatus(204);
  } catch (error) { next(error); }
});

export default router;
