import { Router } from 'express';
import amqp from 'amqplib';
import pendingTasksDB from '../models/pendingTasksDB.js';
import usersData from '../models/usersData.js';
import { authenticateToken } from '../functions/authFunctions.js';
import findUser from '../functions/findUser.js';

const router = Router();

const RABBITMQ_URL = process.env.RABBITMQ_URL; 
const QUEUE_NAME = 'taskQueue';

router.post('/test/create', authenticateToken, async (req, res) => {
    try {
        
        const { testId, testName, prompt, numQuestions, difficulty, selectedModel } = req.body;
        
        const user = await findUser(req.user.email);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const modelMap = {
            "Gemini 1.5 Flash": "gemini-1.5-flash",
            "Gemini 1.5 Pro": "gemini-1.5-pro"
        };

        const mappedModel = modelMap[selectedModel] || selectedModel;

        // Create a new task object
        const task = {
            testID: testId,
            testName: testName,
            testPrompt: prompt,
            questionCount: numQuestions,
            testDifficulty: difficulty,
            testModel: mappedModel,
            status: 'queued', // Set initial status
            user: user._id // Associate the task with the user's ID
        };

        // Connect to RabbitMQ and publish the task
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        
        await channel.assertQueue(QUEUE_NAME);
        channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(task)));

        console.log('Task published to queue:', task);

        // Optionally, save the task to the database with 'queued' status
        const newTask = new pendingTasksDB(task);
        await newTask.save();

        // Respond with success
        res.status(201).json({ message: 'Task created successfully!', task: newTask });

        // Clean up
        setTimeout(() => {
            channel.close();
            connection.close();
        }, 500);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ message: 'Failed to create task', error: error.message });
    }
});

export default router;
