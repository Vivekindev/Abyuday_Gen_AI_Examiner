import { Router } from 'express';
import { authenticateToken } from '../functions/authFunctions.js';

import findUser from '../functions/findUser.js';
import pendingTasksDB from '../models/pendingTasksDB.js';
import { GEMINI_MODELS } from '../config/geminiModels.js';
import Team from '../models/team.js';

const router = Router();

router.post('/fetchcreatedtests',authenticateToken, async (req, res) => {
    try {
      const user = await findUser(req.user.email);
  
      // Fetch all the tests related to the user._id
      if (!user) return res.status(404).json({ error: 'User not found' });
      const teams = await Team.find({ 'members.user': user._id }).select('name');
      const teamNames = new Map(teams.map((team) => [String(team._id), team.name]));
      const tests = await pendingTasksDB.find({
        $or: [{ user: user._id }, { team: { $in: teams.map((team) => team._id) } }],
      }).sort({ _id: -1 }).limit(200);
      const data = convertTestData(tests, teamNames);
      res.status(200).json( data );
    } 
    catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred while fetching tests' });
    }
  });







  function convertTestData(input, teamNames) {
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
            createdAt: item._id.getTimestamp(),
            testName: item.testName,
            questionCount: item.questionCount,
            status: item.status,
            difficulty: difficultyLevel,
            testModel: GEMINI_MODELS[item.testModel] || item.testModel,
            teamName: item.team ? teamNames.get(String(item.team)) || 'Team' : 'Personal',
        };
    });
}

  

export default router;
