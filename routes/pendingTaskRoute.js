import { Router } from 'express';
import amqp from 'amqplib';
import crypto from 'node:crypto';
import pendingTasksDB from '../models/pendingTasksDB.js';
import usersData from '../models/usersData.js';
import { authenticateToken } from '../functions/authFunctions.js';
import findUser from '../functions/findUser.js';
import { DEFAULT_GEMINI_MODEL, isSupportedGeminiModel } from '../config/geminiModels.js';
import { canManageTeam, getTeamMembership } from '../functions/teamAccess.js';

const router = Router();

const QUEUE_NAME = 'taskQueue';

router.post('/test/create', authenticateToken, async (req, res) => {
    try {
        
        const { testName, prompt, numQuestions, difficulty, selectedModel, teamId } = req.body;
        const testId = crypto.randomBytes(8).toString('hex');
        const count = Number(numQuestions);
        const level = Number(difficulty);
        const model = selectedModel || DEFAULT_GEMINI_MODEL;
        if (typeof testName !== 'string' || testName.trim().length < 2 || testName.length > 80 ||
            typeof prompt !== 'string' || prompt.trim().length < 8 || prompt.length > 3000 ||
            !Number.isInteger(count) || count < 1 || count > 50 ||
            !Number.isInteger(level) || level < 1 || level > 10 ||
            !isSupportedGeminiModel(model)) {
            return res.status(400).json({ message: 'Check the test name, prompt, question count (1-50), difficulty (1-10), and model.' });
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
            user: user._id,
            team: teamId || null
        };

        // Save before publishing so the worker can always find the task.
        const newTask = new pendingTasksDB(task);
        await newTask.save();
        req.activity = { action: 'assessment.created', testID: testId };

        let connection;
        try {
            connection = await amqp.connect(process.env.RABBITMQ_URL);
            const channel = await connection.createConfirmChannel();
            await channel.assertQueue(QUEUE_NAME, { durable: true });
            channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(task)), { persistent: true });
            await channel.waitForConfirms();
            await channel.close();
        } catch (queueError) {
            newTask.status = 'Error';
            await newTask.save();
            throw queueError;
        } finally {
            await connection?.close();
        }

        // Respond with success
        res.status(201).json({ message: 'Task created successfully!', task: newTask });

    } catch (error) {
        console.error('Error creating task:', error);
        res.status(503).json({ message: 'Could not queue the test. Try again shortly.' });
    }
});

export default router;
