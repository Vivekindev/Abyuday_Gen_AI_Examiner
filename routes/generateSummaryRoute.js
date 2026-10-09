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
      return res.status(200).json({ summary: question.explanation, grounding: test.grounding || null });
    }
    let grounding = null;
    const summary = await geminiSummaryRun(question.questionText, question.answer, DEFAULT_GEMINI_MODEL, {
      user: user._id, team: test.team, testID, onGrounding: (value) => { grounding = value; },
    });
    req.activity = { action: 'explanation.generated', testID };
    res.status(200).json({ summary, grounding });
  } catch (error) {
    console.error('Error in /generate-summary:', { httpStatus: error.status || null });
    res.status(error.status === 429 ? 429 : 502).json({
      error: error.status === 429 ? 'Gemini’s quota or rate limit was reached. Check your Google AI Studio quota and billing, then try again.'
        : error.status === 503 ? 'Gemini is busy right now. Try the explanation again shortly.' : 'Failed to generate explanation',
    });
  }
});

export default router;
