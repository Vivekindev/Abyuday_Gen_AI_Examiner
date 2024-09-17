import { Router } from 'express';
import geminiQueryRun from '../functions/geminiQueryRun.js';

const router = Router();

router.post('/gemini/prompt', async(req,res)=>{
const {prompt, modelName}  = req.body;

const response = await geminiQueryRun(prompt, modelName);
res.send(response);

})


export default router;