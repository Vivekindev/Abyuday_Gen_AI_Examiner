import { Router } from 'express';
import { authenticateToken } from '../functions/authFunctions.js';
import findUser from '../functions/findUser.js';
import testWindow from '../models/testWindow.js';
import generatedTests from '../models/generatedTests.js';
import Team from '../models/team.js';
import { recordActivity } from '../functions/telemetry.js';
import { publicQuestion, validAnswer, scoreAnswers, assessmentMinutes } from '../functions/assessment/engines.js';

const router = Router();
router.use('/test', authenticateToken);

const remainingSeconds = (session) => Math.max(0, Math.ceil((session.expiryTime.getTime() - Date.now()) / 1000));
const publicQuestions = (questions) => questions.map(publicQuestion);

const validateOptions = (selected, questions) =>
  Array.isArray(selected) && selected.length === questions.length &&
  selected.every((answer, index) => validAnswer(questions[index], answer));

const finish = async (session, questions, team) => {
  if (session.isEnded) return session;
  const source = remainingSeconds(session) === 0 ? 'system' : 'user';
  const selected = Array.isArray(session.selectedOptions) ? session.selectedOptions : [];
  // Only the first finisher may publish a score; concurrent submits return that result.
  const finished = await testWindow.findOneAndUpdate(
    { _id: session._id, isEnded: false },
    { $set: { results: scoreAnswers(questions, selected), selectedOptions: selected, isOngoing: false, isEnded: true, endedAt: new Date() } },
    { new: true },
  );
  const final = finished || await testWindow.findById(session._id);
  session.set(final.toObject());
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
  if (test.team && !await Team.exists({ _id: test.team, deletingAt: null, 'members.user': user._id })) {
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
        expiryTime: new Date(now.getTime() + assessmentMinutes(questions) * 60_000),
        timeAlloted: assessmentMinutes(questions), selectedOptions: Array(questions.length).fill(''),
      } },
      { upsert: true, new: true, setDefaultsOnInsert: true, includeResultMetadata: true },
    );
    const session = result.value;
    if (test.team && !await Team.exists({ _id: test.team, deletingAt: null })) {
      if (!result.lastErrorObject?.updatedExisting) await testWindow.deleteOne({ _id: session._id });
      return res.status(409).json({ error: 'This team is being deleted. The assessment is no longer available.' });
    }
    req.activity = { testID, action: !result.lastErrorObject?.updatedExisting ? 'attempt.started' : session.isEnded ? 'attempt.reviewed' : 'attempt.resumed' };
    if (req.activity.action === 'attempt.started') req.activity.eventKey = `attempt.started:${session.id}`;
    if (!session.isEnded && remainingSeconds(session) === 0) await finish(session, questions, test.team);
    respondSession(res, session, questions);
  } catch (error) { next(error); }
});

router.post('/test/again', async (req, res, next) => {
  try {
    const context = await getContext(req, res);
    if (!context) return;
    const session = await testWindow.findOne({ testID: context.testID, user: context.user._id });
    if (!session || !session.isEnded) return res.status(409).json({ error: 'Complete this attempt before starting again.' });
    const now = new Date();
    const reset = await testWindow.findOneAndUpdate(
      { _id: session._id, isEnded: true },
      { $set: {
        isOngoing: true, isEnded: false, startTime: now,
        expiryTime: new Date(now.getTime() + assessmentMinutes(context.questions) * 60_000),
        timeAlloted: assessmentMinutes(context.questions),
        selectedOptions: Array(context.questions.length).fill(''),
        results: null, endedAt: null, flagCount: 0,
      } },
      { new: true },
    );
    if (!reset) return res.status(409).json({ error: 'This attempt has already been restarted.' });
    req.activity = { action: 'attempt.restarted', testID: context.testID, eventKey: `attempt.restarted:${reset.id}:${now.getTime()}` };
    respondSession(res, reset, context.questions);
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
    const saved = await testWindow.findOneAndUpdate(
      { _id: session._id, isEnded: false, expiryTime: { $gt: new Date() } },
      { $set: { selectedOptions: req.body.selectedOptions } },
      { new: true },
    );
    if (!saved) return res.status(409).json({ error: 'This attempt has ended.' });
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
