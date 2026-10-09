import { Router } from 'express';
import crypto from 'node:crypto';
import pendingTasksDB from '../models/pendingTasksDB.js';
import generatedTests from '../models/generatedTests.js';
import { publishAssessmentTask } from '../functions/taskQueue.js';
import { authenticateToken } from '../functions/authFunctions.js';
import findUser from '../functions/findUser.js';
import { DEFAULT_GEMINI_MODEL, isSupportedGeminiModel } from '../config/geminiModels.js';
import { canManageTeam, getTeamMembership } from '../functions/teamAccess.js';
import { EngineRequest } from '../models/assessmentEngine.js';
import testWindow from '../models/testWindow.js';
import { difficultyRating } from '../shared/difficulty.js';
import { cancelPendingEmails, notifyGeneration } from '../functions/emailing/notifications.js';

const router = Router();

router.post('/test/create', authenticateToken, async (req, res) => {
    try {
        
        const { testName, prompt, numQuestions, difficulty, selectedModel, teamId, assessmentMode = 'mcq' } = req.body;
        const testId = crypto.randomBytes(8).toString('hex');
        const count = Number(numQuestions);
        const level = difficultyRating(difficulty);
        const model = selectedModel || DEFAULT_GEMINI_MODEL;
        if (typeof testName !== 'string' || testName.trim().length < 2 || testName.length > 80 ||
            typeof prompt !== 'string' || prompt.trim().length < 8 || prompt.length > 3000 ||
            !Number.isInteger(count) || count < 1 || count > 50 ||
            level === null ||
            !isSupportedGeminiModel(model) || !['mcq', 'interactive'].includes(assessmentMode) ||
            (assessmentMode === 'interactive' && count > 20)) {
            return res.status(400).json({ message: 'Check the test name, prompt, question count (1-50; interactive 1-20), difficulty (Easy, Medium, Hard, or 0-10), format, and model.' });
        }
        
        const user = await findUser(req.user.email);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (teamId) {
            const membership = await getTeamMembership(teamId, user._id);
            if (!membership || !canManageTeam(membership.role)) {
                return res.status(403).json({ message: 'Only team owners and admins can create team tests.' });
            }
            req.monitoringTeam = membership.team._id;
        }

        // Create a new task object
        const task = {
            testID: testId,
            testName: testName.trim(),
            testPrompt: prompt.trim(),
            questionCount: count,
            testDifficulty: level,
            testModel: model,
            status: 'Queued',
            assessmentMode,
            user: user._id,
            team: teamId || null
        };

        // Save before publishing so the worker can always find the task.
        const newTask = new pendingTasksDB(task);
        await newTask.save();
        if (teamId && !await getTeamMembership(teamId, user._id)) {
            await pendingTasksDB.deleteOne({ _id: newTask._id });
            return res.status(409).json({ message: 'This team is no longer available for new assessments.' });
        }
        req.activity = { action: 'assessment.created', testID: testId };

        try {
            await publishAssessmentTask(newTask);
        } catch (queueError) {
            const failed = await pendingTasksDB.updateOne({ _id: newTask._id, status: 'Queued', generationAttempt: 0 }, { $set: { status: 'Error', generationNotificationPending: true } });
            if (failed.modifiedCount) await notifyGeneration(newTask, false);
            throw queueError;
        }

        // Respond with success
        res.status(201).json({ message: 'Task created successfully!', task: newTask });

    } catch (error) {
        console.error('Error creating task:', error);
        res.status(503).json({ message: 'Could not queue the test. Try again shortly.' });
    }
});

router.post('/test/retry', authenticateToken, async (req, res, next) => {
    try {
        const { testID } = req.body || {};
        if (typeof testID !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(testID)) {
            return res.status(400).json({ message: 'A valid assessment ID is required.' });
        }
        const user = await findUser(req.user.email);
        if (!user) return res.status(404).json({ message: 'User not found.' });
        const task = await pendingTasksDB.findOne({ testID });
        if (!task) return res.status(404).json({ message: 'Assessment not found.' });
        if (task.team) {
            const membership = await getTeamMembership(task.team, user._id);
            if (!membership || !canManageTeam(membership.role)) return res.status(403).json({ message: 'Only current team owners and admins can retry this assessment.' });
            req.monitoringTeam = task.team;
        } else if (String(task.user) !== String(user._id)) {
            return res.status(403).json({ message: 'Only the creator can retry this assessment.' });
        }
        if (task.status !== 'Error' || await generatedTests.exists({ testID })) {
            return res.status(409).json({ message: 'Only failed assessments without published questions can be retried.' });
        }
        // Claim once, even if multiple browser tabs submit Retry together.
        const queued = await pendingTasksDB.findOneAndUpdate(
            { _id: task._id, status: 'Error' },
            { $set: { status: 'Queued', generationStage: 'queued', retryCount: 0 }, $inc: { generationAttempt: 1 }, $unset: { generationError: 1, nextAttemptAt: 1 } },
            { new: true },
        );
        if (!queued) return res.status(409).json({ message: 'This assessment has already been retried. Refresh its status.' });
        try {
            await publishAssessmentTask(queued);
        } catch {
            // Do not overwrite a worker that already received an ambiguously confirmed message.
            const restored = await pendingTasksDB.updateOne(
                { _id: queued._id, status: 'Queued', generationAttempt: queued.generationAttempt },
                { $set: { status: 'Error', generationNotificationPending: true } },
            );
            if (restored.modifiedCount) {
                await notifyGeneration(queued, false);
                return res.status(503).json({ message: 'Could not queue the retry. Your assessment is still available to retry.' });
            }
        }
        req.activity = { action: 'assessment.retried', testID };
        return res.status(202).json({ testID, status: 'Queued', message: 'Assessment queued for another generation attempt.' });
    } catch (error) { next(error); }
});

router.delete('/test/:testID', authenticateToken, async (req, res, next) => {
    try {
        const testID = req.params.testID;
        if (!/^[a-zA-Z0-9_-]{1,64}$/.test(testID)) return res.status(400).json({ message: 'A valid assessment ID is required.' });
        const user = await findUser(req.user.email);
        const task = await pendingTasksDB.findOne({ testID });
        if (!user || !task) return res.status(404).json({ message: 'Assessment not found.' });
        if (task.team) {
            const membership = await getTeamMembership(task.team, user._id);
            if (!membership || !canManageTeam(membership.role)) return res.status(403).json({ message: 'Only team owners and admins can manage this assessment.' });
            req.monitoringTeam = membership.team._id;
        } else if (String(task.user) !== String(user._id)) {
            return res.status(403).json({ message: 'Only the creator can manage this assessment.' });
        }
        if (task.status === 'Processing') return res.status(409).json({ message: 'Wait for generation to finish before deleting this assessment.' });
        await cancelPendingEmails({ testID });
        await Promise.all([
            pendingTasksDB.deleteOne({ _id: task._id }),
            generatedTests.deleteOne({ testID }),
            testWindow.deleteMany({ testID }),
            EngineRequest.deleteMany({ testID }),
        ]);
        req.activity = { action: 'assessment.deleted', testID };
        res.sendStatus(204);
    } catch (error) { next(error); }
});

export default router;
