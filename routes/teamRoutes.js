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
    res.json(teams.map((team) => ({
      id: team.id,
      name: team.name,
      role: team.members.find((member) => String(member.user) === req.currentUser.id).role,
      memberCount: team.members.length,
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
    const invite = await TeamInvite.findOne({ tokenHash: hashToken(req.params.token), usedAt: null, expiresAt: { $gt: new Date() } }).populate('team', 'name');
    if (!invite || !invite.team) return res.status(404).json({ error: 'Invite is invalid or expired.' });
    res.json({ teamName: invite.team.name, email: invite.email, role: invite.role, expiresAt: invite.expiresAt });
  } catch (error) { next(error); }
});

router.post('/teams/invites/:token/accept', async (req, res, next) => {
  try {
    const invite = await TeamInvite.findOne({ tokenHash: hashToken(req.params.token), usedAt: null, expiresAt: { $gt: new Date() } });
    if (!invite) return res.status(404).json({ error: 'Invite is invalid or expired.' });
    if (invite.email !== req.currentUser.email) return res.status(403).json({ error: 'Sign in with the invited email address.' });
    const joined = await Team.updateOne(
      { _id: invite.team, 'members.user': { $ne: req.currentUser._id } },
      { $push: { members: { user: req.currentUser._id, role: invite.role, joinedAt: new Date() } } },
    );
    const team = await Team.findById(invite.team);
    if (!team) return res.sendStatus(404);
    invite.usedAt = new Date();
    await invite.save();
    req.monitoringTeam = team._id;
    if (joined.modifiedCount) req.activity = { action: 'team.joined', role: invite.role };
    res.json({ id: team.id, name: team.name });
  } catch (error) { next(error); }
});

router.get('/teams/:teamId', async (req, res, next) => {
  try {
    const membership = await getTeamMembership(req.params.teamId, req.currentUser._id);
    if (!membership) return res.sendStatus(404);
    req.monitoringTeam = membership.team._id;
    await membership.team.populate('members.user', 'email userName');
    res.json({
      id: membership.team.id, name: membership.team.name, role: membership.role,
      members: membership.team.members.map(({ user, role, joinedAt }) => ({
        id: user.id, email: user.email, name: user.userName, role, joinedAt,
      })),
    });
  } catch (error) { next(error); }
});

router.get('/teams/:teamId/results', async (req, res, next) => {
  try {
    const membership = await getTeamMembership(req.params.teamId, req.currentUser._id);
    if (!membership) return res.sendStatus(404);
    req.monitoringTeam = membership.team._id;
    if (!canManageTeam(membership.role)) return res.sendStatus(403);
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
    req.activity = { action: 'invite.created', role, targetUser: invitedUser?._id };
    res.status(201).json({ token, expiresAt: invite.expiresAt });
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
    res.json(invites.map((invite) => ({ id: invite.id, email: invite.email, role: invite.role, expiresAt: invite.expiresAt })));
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
    target.role = role;
    await membership.team.save();
    req.activity = { action: 'member.role_changed', targetUser: target.user, role };
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
    res.sendStatus(204);
  } catch (error) { next(error); }
});

export default router;
