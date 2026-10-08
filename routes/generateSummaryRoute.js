import express from 'express';
import { geminiSummaryRun } from '../functions/geminiQueryRun.js';
import { authenticateToken } from '../functions/authFunctions.js';
import { DEFAULT_GEMINI_MODEL } from '../config/geminiModels.js';
import findUser from '../functions/findUser.js';
import testWindow from '../models/testWindow.js';
import generatedTests from '../models/generatedTests.js';
import Team from '../models/team.js';

const router = express.Router();

router.post('/generate-summary', authenticateToken, async (req, res) => {
  const { testID, questionIndex } = req.body || {};

  if (typeof testID !== 'string' || !Number.isInteger(questionIndex) || questionIndex < 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const user = await findUser(req.user.email);
    if (!user) return res.sendStatus(401);
    const session = await testWindow.findOne({ testID, user: user._id, isEnded: true });
    if (!session) return res.status(403).json({ error: 'Complete this test to view explanations.' });
    const test = await generatedTests.findOne({ testID });
    if (test?.team && !await Team.exists({ _id: test.team, deletingAt: null, 'members.user': user._id })) return res.sendStatus(403);
    req.monitoringTeam = test?.team || null;
    const question = test?.response?.[questionIndex];
    if (!question) return res.sendStatus(404);
    if (question.kind && question.kind !== 'mcq') {
      return res.status(200).json({ summary: question.explanation });
    }
    const summary = await geminiSummaryRun(question.questionText, question.answer, DEFAULT_GEMINI_MODEL, { user: user._id, team: test.team, testID });
    req.activity = { action: 'explanation.generated', testID };
    res.status(200).json({ summary });
  } catch (error) {
    console.error('Error in /generate-summary:', error);
    res.status(502).json({ error: 'Failed to generate explanation' });
  }
});

export default router;
