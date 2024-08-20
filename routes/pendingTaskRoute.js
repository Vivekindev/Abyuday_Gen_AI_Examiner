import { Router } from 'express';
import pendingTasksDB from '../models/pendingTasksDB.js';

const router = Router();

router.post('/test/create', async (req, res) => {
    try {
        // Extract data from the request body
        const { testId, testName, prompt, numQuestions, difficulty, selectedModel } = req.body;

        // Create a new task document
        const newTask = new pendingTasksDB({
            testID: testId,
            testName: testName,
            testPrompt: prompt,
            questionCount: numQuestions,
            testDifficulty: difficulty,
            testModel: selectedModel,
            status: false 
        });

        // Save the task to the database
        await newTask.save();

        // Respond with success
        res.status(201).json({ message: 'Task created successfully!', task: newTask });
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ message: 'Failed to create task', error: error.message });
    }
});

export default router;
