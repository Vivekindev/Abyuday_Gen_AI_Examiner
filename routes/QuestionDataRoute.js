import { Router } from 'express';
import { authenticateToken } from '../functions/authFunctions.js';
import findUser from '../functions/findUser.js';
import generatedTests from '../models/generatedTests.js';
import pendingTasksDB from '../models/pendingTasksDB.js';
import { getTeamMembership, canManageTeam } from '../functions/teamAccess.js';
import { assessmentMinutes } from '../functions/assessment/engines.js';

const router = Router();

router.post('/test/getinfo', authenticateToken, async (req, res, next) => {
  try {
    const testID = typeof req.body?.testID === 'string' ? req.body.testID.trim() : '';
    if (!testID || testID.length > 64) return res.status(400).json({ error: 'Invalid test ID.' });
    const details = await pendingTasksDB.findOne({ testID }).populate('user', 'userName');
    if (!details) return res.sendStatus(404);
    const user = await findUser(req.user.email);
    if (!user) return res.sendStatus(401);
    const membership = details.team ? await getTeamMembership(details.team, user._id) : null;
    if (details.team && !membership) {
      return res.sendStatus(403);
    }
    const generated = await generatedTests.findOne({ testID }).select('response').lean();
    req.monitoringTeam = details.team || null;
    // Generation status polling is represented by API metrics, not repeated activity entries.
    if (generated) req.activity = { action: 'assessment.viewed', testID };
    res.json({
      name: details.testName, id: testID, createdBy: details.user?.userName || 'User',
      noOfQuestions: Number(details.questionCount), testTime: generated ? `${assessmentMinutes(generated.response)} minutes` : details.assessmentMode === 'interactive' ? 'Calculated when ready' : `${details.questionCount} minutes`,
      assessmentMode: details.assessmentMode || 'mcq', generationStage: details.generationStage,
      questionKinds: generated ? [...new Set(generated.response.map((q) => q.kind || 'mcq'))] : [],
      difficulty: Number(details.testDifficulty) >= 7 ? 'Hard' : Number(details.testDifficulty) >= 4 ? 'Medium' : 'Easy',
      status: generated ? 'Ready' : details.status,
      generationError: details.status === 'Error' && (details.team ? canManageTeam(membership.role) : String(details.user?._id) === String(user._id)) ? details.generationError : undefined,
      canRetry: !generated && details.status === 'Error' && (details.team ? canManageTeam(membership.role) : String(details.user?._id) === String(user._id)),
    });
  } catch (error) { next(error); }
});

export default router;
