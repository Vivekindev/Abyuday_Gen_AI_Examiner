import { Router } from 'express';
import { authenticateToken } from '../functions/authFunctions.js';
import findUser from '../functions/findUser.js';
import generatedTests from '../models/generatedTests.js';
import pendingTasksDB from '../models/pendingTasksDB.js';
import Team from '../models/team.js';

const router = Router();

router.post('/test/getinfo', authenticateToken, async (req, res, next) => {
  try {
    const testID = typeof req.body?.testID === 'string' ? req.body.testID.trim() : '';
    if (!testID || testID.length > 64) return res.status(400).json({ error: 'Invalid test ID.' });
    const details = await pendingTasksDB.findOne({ testID }).populate('user', 'userName');
    if (!details) return res.sendStatus(404);
    const user = await findUser(req.user.email);
    if (!user) return res.sendStatus(401);
    if (details.team && !await Team.exists({ _id: details.team, 'members.user': user._id })) {
      return res.sendStatus(403);
    }
    const generated = await generatedTests.exists({ testID });
    req.monitoringTeam = details.team || null;
    // Generation status polling is represented by API metrics, not repeated activity entries.
    if (generated) req.activity = { action: 'assessment.viewed', testID };
    res.json({
      name: details.testName, id: testID, createdBy: details.user?.userName || 'User',
      noOfQuestions: Number(details.questionCount), testTime: `${details.questionCount} minutes`,
      difficulty: Number(details.testDifficulty) >= 7 ? 'Hard' : Number(details.testDifficulty) >= 4 ? 'Medium' : 'Easy',
      status: generated ? 'Ready' : details.status,
    });
  } catch (error) { next(error); }
});

export default router;
