import { Router } from 'express';
import { authenticateToken } from '../functions/authFunctions.js';
import findUser from '../functions/findUser.js';
import testWindow from '../models/testWindow.js';
import generatedTests from '../models/generatedTests.js';
import Team from '../models/team.js';
import { recordActivity } from '../functions/telemetry.js';

const router = Router();
router.use('/test', authenticateToken);

const remainingSeconds = (session) => Math.max(0, Math.ceil((session.expiryTime.getTime() - Date.now()) / 1000));
const publicQuestions = (questions) => questions.map(({ questionText, options, tag }) => ({ questionText, options, tag }));

const validateOptions = (selected, questions) =>
  Array.isArray(selected) && selected.length === questions.length &&
  selected.every((answer, index) => answer === '' || questions[index].options.includes(answer));

const finish = async (session, questions, team) => {
  if (session.isEnded) return session;
  const source = remainingSeconds(session) === 0 ? 'system' : 'user';
  const selected = Array.isArray(session.selectedOptions) ? session.selectedOptions : [];
  const correct = questions.reduce((count, question, index) => count + (selected[index] === question.answer ? 1 : 0), 0);
  const answered = selected.filter(Boolean).length;
  session.results = {
    score: correct, total: questions.length, incorrect: answered - correct,
    unanswered: questions.length - answered,
    percentage: Math.round((correct / questions.length) * 100),
  };
  session.isOngoing = false;
  session.isEnded = true;
  session.endedAt = new Date();
  await session.save();
  await recordActivity({ user: session.user, team: team || null, action: 'attempt.completed', source, testID: session.testID, eventKey: `attempt.completed:${session.id}` });
  return session;
};

const getContext = async (req, res) => {
  const testID = typeof req.body?.testID === 'string' ? req.body.testID.trim() : '';
  if (!testID || testID.length > 64) {
    res.status(400).json({ error: 'Invalid test ID.' });
    return null;
  }
  const user = await findUser(req.user.email);
  if (!user) { res.sendStatus(401); return null; }
  const test = await generatedTests.findOne({ testID });
  if (!test || !Array.isArray(test.response) || test.response.length === 0) {
    res.status(404).json({ error: 'Test is not ready or does not exist.' });
    return null;
  }
  if (test.team && !await Team.exists({ _id: test.team, 'members.user': user._id })) {
    res.sendStatus(403);
    return null;
  }
  req.monitoringTeam = test.team || null;
  return { user, test, testID, questions: test.response };
};

const respondSession = (res, session, questions) => res.json({
  isEnded: session.isEnded,
  remTime: session.isEnded ? 0 : remainingSeconds(session),
  selectedOptions: session.selectedOptions,
  testQuestions: session.isEnded ? questions : publicQuestions(questions),
  results: session.isEnded ? session.results : null,
});

router.post('/test/begin', async (req, res, next) => {
  try {
    const context = await getContext(req, res);
    if (!context) return;
    const { user, testID, questions, test } = context;
    const now = new Date();
    const result = await testWindow.findOneAndUpdate(
      { testID, user: user._id },
      { $setOnInsert: {
        isOngoing: true, isEnded: false, startTime: now,
        expiryTime: new Date(now.getTime() + questions.length * 60_000),
        timeAlloted: questions.length, selectedOptions: Array(questions.length).fill(''),
      } },
      { upsert: true, new: true, setDefaultsOnInsert: true, includeResultMetadata: true },
    );
    const session = result.value;
    req.activity = { testID, action: !result.lastErrorObject?.updatedExisting ? 'attempt.started' : session.isEnded ? 'attempt.reviewed' : 'attempt.resumed' };
    if (req.activity.action === 'attempt.started') req.activity.eventKey = `attempt.started:${session.id}`;
    if (!session.isEnded && remainingSeconds(session) === 0) await finish(session, questions, test.team);
    respondSession(res, session, questions);
  } catch (error) { next(error); }
});

router.post('/test/remtime', async (req, res, next) => {
  try {
    const context = await getContext(req, res);
    if (!context) return;
    const session = await testWindow.findOne({ testID: context.testID, user: context.user._id });
    if (!session) return res.sendStatus(404);
    if (!session.isEnded && remainingSeconds(session) === 0) await finish(session, context.questions, context.test.team);
    res.json({ remTime: session.isEnded ? 0 : remainingSeconds(session), isEnded: session.isEnded });
  } catch (error) { next(error); }
});

router.post('/test/saveoptions', async (req, res, next) => {
  try {
    const context = await getContext(req, res);
    if (!context) return;
    if (!validateOptions(req.body.selectedOptions, context.questions)) {
      return res.status(400).json({ error: 'Invalid answers.' });
    }
    const session = await testWindow.findOne({ testID: context.testID, user: context.user._id });
    if (!session) return res.sendStatus(404);
    if (session.isEnded || remainingSeconds(session) === 0) {
      await finish(session, context.questions, context.test.team);
      return res.status(409).json({ error: 'This attempt has ended.' });
    }
    session.selectedOptions = req.body.selectedOptions;
    await session.save();
    req.activity = { action: 'answers.saved', testID: context.testID };
    res.json({ saved: true });
  } catch (error) { next(error); }
});

router.post('/test/submit', async (req, res, next) => {
  try {
    const context = await getContext(req, res);
    if (!context) return;
    const session = await testWindow.findOne({ testID: context.testID, user: context.user._id });
    if (!session) return res.sendStatus(404);
    if (!session.isEnded && remainingSeconds(session) > 0 && req.body.selectedOptions !== undefined) {
      if (!validateOptions(req.body.selectedOptions, context.questions)) {
        return res.status(400).json({ error: 'Invalid answers.' });
      }
      session.selectedOptions = req.body.selectedOptions;
    }
    await finish(session, context.questions, context.test.team);
    respondSession(res, session, context.questions);
  } catch (error) { next(error); }
});

export default router;
