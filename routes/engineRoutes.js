import { Router } from 'express';
import { authenticateToken } from '../functions/authFunctions.js';
import findUser from '../functions/findUser.js';
import { getTeamMembership, canManageTeam } from '../functions/teamAccess.js';
import { AssessmentEngine, EngineRequest } from '../models/assessmentEngine.js';
import { engineScope } from '../functions/assessment/engineRegistry.js';

const router = Router();
router.get('/engines', authenticateToken, async (req, res, next) => {
  try {
    const user = await findUser(req.user.email);
    if (!user) return res.sendStatus(401);
    const team = req.query.teamId;
    if (team) {
      if (typeof team !== 'string') return res.status(400).json({ error: 'Invalid team.' });
      const membership = await getTeamMembership(team, user._id);
      if (!membership || !canManageTeam(membership.role)) return res.status(403).json({ error: 'Only team owners and admins can inspect engine requests.' });
    }
    const scope = engineScope({ user: user._id, team });
    const page = Math.min(10000, Math.max(1, parseInt(req.query.page, 10) || 1));
    const limit = 20;
    const [engines, requests, total] = await Promise.all([
      AssessmentEngine.find({ scope, status: 'ready' }).select('key definition createdAt').sort({ createdAt: -1 }).limit(100).lean(),
      EngineRequest.find({ scope }).select('testID slot key domain objective requirement status message createdAt updatedAt').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      EngineRequest.countDocuments({ scope }),
    ]);
    res.set('Cache-Control', 'no-store');
    res.json({ engines: engines.map(({ _id, key, definition, createdAt }) => ({ id: String(_id), key, definition, createdAt })), requests: requests.map(({ _id, ...r }) => ({ id: String(_id), ...r })), page, pages: Math.max(1, Math.ceil(total / limit)), total });
  } catch (error) { next(error); }
});
export default router;
