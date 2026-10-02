import { Router } from 'express';
import { authenticateToken } from '../functions/authFunctions.js';
import findUser from '../functions/findUser.js';
import pendingTasksDB from '../models/pendingTasksDB.js';
import testWindow from '../models/testWindow.js';
import Team from '../models/team.js';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '../functions/authFunctions.js';
import { setAuthCookies } from '../functions/authCookies.js';
import { getPlatformRole } from '../functions/platformAccess.js';

const router = Router();

router.get('/me/attempts', authenticateToken, async (req, res, next) => {
  try {
    const user = await findUser(req.user.email);
    if (!user) return res.sendStatus(401);
    const attempts = await testWindow.find({ user: user._id })
      .select('testID startTime expiryTime endedAt isEnded results').sort({ startTime: -1 }).limit(100).lean();
    const tasks = await pendingTasksDB.find({ testID: { $in: attempts.map((attempt) => attempt.testID) } }).select('testID testName').lean();
    const names = new Map(tasks.map((task) => [task.testID, task.testName]));
    res.json(attempts.map((attempt) => ({
      id: String(attempt._id), testID: attempt.testID, testName: names.get(attempt.testID) || 'Assessment',
      startTime: attempt.startTime, endedAt: attempt.endedAt, isEnded: attempt.isEnded,
      expired: attempt.expiryTime <= new Date(), results: attempt.isEnded ? attempt.results : null,
    })));
  } catch (error) { next(error); }
});

router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await findUser(req.user.email);
    if (!user) return res.sendStatus(401);
    res.json({ id: user.id, name: user.userName || 'User', email: user.email, platformRole: await getPlatformRole(user) });
  } catch (error) { next(error); }
});

router.patch('/me', authenticateToken, async (req, res, next) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'Name must be 2 to 80 characters.' });
    const user = await findUser(req.user.email);
    if (!user) return res.sendStatus(401);
    user.userName = name;
    await user.save();
    req.activity = { action: 'profile.updated' };
    res.json({ id: user.id, name: user.userName, email: user.email, platformRole: await getPlatformRole(user) });
  } catch (error) { next(error); }
});

router.post('/me/password', authenticateToken, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ error: 'Enter the current password and a new password of at least 8 characters.' });
    }
    const user = await findUser(req.user.email);
    if (!user) return res.sendStatus(401);
    if (!/^\$2[aby]\$/.test(user.password || '') || !await bcrypt.compare(currentPassword, user.password)) {
      return res.status(401).json({ error: 'Current password is incorrect or this account uses Google sign-in.' });
    }
    user.password = await bcrypt.hash(newPassword, 12);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    const identity = { email: user.email, version: user.tokenVersion };
    setAuthCookies(res, user, generateAccessToken(identity), generateRefreshToken(identity));
    req.activity = { action: 'password.changed' };
    res.json({ changed: true });
  } catch (error) { next(error); }
});

router.get('/dashboard/overview', authenticateToken, async (req, res, next) => {
  try {
    const user = await findUser(req.user.email);
    if (!user) return res.sendStatus(401);
    const [teams, created, ready, processing, attempts, recent] = await Promise.all([
      Team.countDocuments({ 'members.user': user._id }),
      pendingTasksDB.countDocuments({ user: user._id }),
      pendingTasksDB.countDocuments({ user: user._id, status: 'Done' }),
      pendingTasksDB.countDocuments({ user: user._id, status: { $in: ['queued', 'Queued', 'Processing'] } }),
      testWindow.countDocuments({ user: user._id, isEnded: true }),
      pendingTasksDB.find({ user: user._id }).select('status testID testName').sort({ _id: -1 }).limit(5),
    ]);
    res.json({
      created, ready, processing, attempts, teams,
      recent: recent.map((task) => ({ id: task.testID, name: task.testName, status: task.status })),
    });
  } catch (error) { next(error); }
});

export default router;
