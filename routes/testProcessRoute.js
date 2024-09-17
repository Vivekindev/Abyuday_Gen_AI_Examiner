import { Router } from 'express';
import { authenticateToken } from '../functions/authFunctions.js';
import {generateTestToken} from '../functions/generateTestToken.js';
import findUser from '../functions/findUser.js';
import testWindow from '../models/testWindow.js';
import generatedTests from '../models/generatedTests.js';

const router = Router();

router.post('/test/getsecuretoken', async(req,res)=>{
const email = 'vivekindev@gmail.com';
const testID = '123456';
const expiry = '30';
const testToken = generateTestToken(email, testID, expiry)
res.cookie('testToken', testToken, { httpOnly: true, sameSite: 'Strict'});
res.send({testToken : testToken});
})



router.post('/test/begin', async(req,res)=>{

    try{
        const {testID} = req.body;
    const user = await findUser("vivekindev@gmail.com");
    const test = await generatedTests.findOne({testID : testID});
    const testQuestions = JSON.parse(test.response);

    const userTest = await testWindow.findOne({testID : testID, user: user._id });

    if(!userTest){
        const data = {
            testID : testID,
            isOngoing : true,
            isended : false,
            flagCount : 0,
            startTime : new Date(), 
            timeAlloted : testQuestions.length,
            user : user._id
        }
        const newTest = new testWindow(data);
        await newTest.save();
        const email = 'vivekindev@gmail.com';
        const expiry = testQuestions.length;
        const testToken = generateTestToken(email, testID, expiry)
        res.cookie('testToken', testToken, { httpOnly: true, sameSite: 'Strict'});
    }



res.sendStatus(200);
    }
    catch(err){
        console.error(err);
        res.sendStatus(500);
    }
    


})

export default router;