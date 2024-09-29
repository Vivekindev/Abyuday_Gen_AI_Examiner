import { Router } from 'express';
import { authenticateToken } from '../functions/authFunctions.js';

import findUser from '../functions/findUser.js';
import testWindow from '../models/testWindow.js';
import pendingTasksDB from '../models/pendingTasksDB.js';

const router = Router();

router.post('/fetchcreatedtests',authenticateToken, async (req, res) => {
    try {
      const user = await findUser(req.user.email);
  
      // Fetch all the tests related to the user._id
      const tests = await pendingTasksDB.find({ user: user._id });
      const data = convertTestData(tests);
      res.status(200).json( data );
    } 
    catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred while fetching tests' });
    }
  });







  function convertTestData(input) {
    return input.map((item, index) => {
        let difficultyLevel;
        const difficulty = parseInt(item.testDifficulty);
        
        if (difficulty >= 1 && difficulty <= 3) {
            difficultyLevel = "Easy";
        } else if (difficulty >= 4 && difficulty <= 6) {
            difficultyLevel = "Medium";
        } else if (difficulty >= 7 && difficulty <= 10) {
            difficultyLevel = "Hard";
        }

        return {
            id: index + 1,
            testID: item.testID,
            testName: item.testName,
            questionCount: item.questionCount,
            status: item.status,
            difficulty: difficultyLevel
        };
    });
}

  

export default router;