import { Router } from 'express';
import generatedTests from '../models/generatedTests.js';
import pendingTasksDB from '../models/pendingTasksDB.js';
import usersData from '../models/usersData.js';
const router = Router();

router.post('/test/getdata',async(req,res)=>{
  const {testID} = req.body;
  const QuestionData = await generatedTests.findOne({testID : testID});
  res.send(QuestionData.response);

});

router.post('/test/getinfo',async(req,res)=>{
  try{
    const {testID} = req.body;
const QuestionData = await generatedTests.findOne({testID : testID});
const testDetails = await pendingTasksDB.findOne({testID : testID});
const user = await usersData.findById(testDetails.user);

const data = {
  name : testDetails.testName,
  id : testID,
  createdBy : user.userName,
  noOfQuestions : testDetails.questionCount,
  testTime : (testDetails.questionCount + " Minutes"),
  difficulty : (testDetails.testDifficulty >=7)?("Hard"):(testDetails.testDifficulty >=4)?("Medium"):("Easy")
}
res.send(data);
  }
catch(err){
  res.sendStatus(404);
  console.error(err);
}

});


export default router;