import { Router } from 'express';
import { authenticateToken, authenticateTestToken } from '../functions/authFunctions.js';
import { generateTestToken } from '../functions/generateTestToken.js';
import findUser from '../functions/findUser.js';
import testWindow from '../models/testWindow.js';
import generatedTests from '../models/generatedTests.js';

const router = Router();

// Helper function to calculate remaining time
const calculateRemainingTime = (expiryTime) => {
    const currentTime = new Date();
    const timeDifference = expiryTime - currentTime; // time difference in milliseconds

    if (timeDifference <= 0) {
        return 0;
    }
    
    return Math.floor(timeDifference / 1000); // convert to seconds
};


// Route to begin the test
router.post('/test/begin', authenticateToken, async (req, res) => {
    try {
        const { testID } = req.body;
        const user = await findUser(req.user.email);
        const test = await generatedTests.findOne({ testID });

        if (!test) {
            return res.status(404).send('Test not found');
        }

        const testQuestions = test.response;
        let userTest = await testWindow.findOne({ testID, user: user._id });
        let selectedOptions = Array(testQuestions.length).fill('');

        if (!userTest) {
            const currentTime = new Date();
            const expiryTime = new Date(currentTime.getTime() + testQuestions.length * 60000); // 1 minute per question
            

            const data = {
                testID,
                isOngoing: true,
                isEnded: false,
                flagCount: 0,
                startTime: currentTime,
                expiryTime,
                timeAlloted: testQuestions.length,
                user: user._id,
                selectedOptions: selectedOptions,
            };

            userTest = new testWindow(data);
            await userTest.save();

            const testToken = generateTestToken(user.email, testID, testQuestions.length);
            res.cookie('testToken', testToken, { httpOnly: true, sameSite: 'Strict' });
       
            const retData = {
                isEnded: false,
                testQuestions,
                remTime: testQuestions.length * 60, // seconds
                selectedOptions: selectedOptions,
            };
            return res.send(retData);
        }

        // If the test already exists, calculate remaining time
        const remTime = calculateRemainingTime(userTest.expiryTime);

        if (remTime === 0) {
            userTest.isEnded = true;
            await userTest.save();
        }
        selectedOptions = await userTest.selectedOptions;
       

        const retData = {
            isEnded: userTest.isEnded,
            testQuestions,
            selectedOptions: userTest.selectedOptions,
            remTime,
            selectedOptions : selectedOptions,
        };

        res.send(retData);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});


// Short polling to get remaining time using POST
router.post('/test/remtime', authenticateToken, async (req, res) => {
    try {
        const { testID } = req.body;
        const user = await findUser(req.user.email);
        const userTest = await testWindow.findOne({ testID, user: user._id });

        if (!userTest) {
            return res.status(404).send('Test not found for user');
        }

        const remTime = calculateRemainingTime(userTest.expiryTime);

        if (remTime <= 0) { 
            userTest.isEnded = true;
            userTest.isOngoing = false;
            await userTest.save();
            return res.json({ remTime: 0, isEnded: true });
        }

        res.json({ remTime, isEnded: false });
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});



router.post('/test/saveoptions', authenticateToken, async (req, res) => {
    try {
        const { testID, selectedOptions } = req.body;
        const user = await findUser(req.user.email);       
        if (!user) {   return res.status(404).json({ error: "User not found" });    }
        const userTest = await testWindow.findOne({ testID, user: user._id });
        if (!userTest) {   return res.status(404).json({ error: "Test not found" });  }

        userTest.selectedOptions = selectedOptions;
        await userTest.save();

        res.status(200).json({ message: "Options saved successfully" });
    } catch (error) {
        res.status(500).json({ error: "An error occurred while saving options" });
    }
});



router.post('/test/submit', authenticateToken, async(req,res)=>{
    
    try {
        const { testID } = req.body;
        const user = await findUser(req.user.email);       
        if (!user) {   return res.status(404).json({ error: "User not found" });    }
        const userTest = await testWindow.findOne({ testID, user: user._id });
        if (!userTest) {   return res.status(404).json({ error: "Test not found" });  }

        userTest.isOngoing = false;
        userTest.isEnded = true;

        await userTest.save();

    } catch (error) {
        console.error(error);
    }
});




export default router;
