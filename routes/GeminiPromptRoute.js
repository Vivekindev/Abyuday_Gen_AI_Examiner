import { Router } from 'express';
import geminiQueryRun from '../functions/geminiQueryRun.js';
import { authenticateToken } from '../functions/authFunctions.js';
import { DEFAULT_GEMINI_MODEL, isSupportedGeminiModel } from '../config/geminiModels.js';

const router = Router();

router.post('/gemini/prompt', authenticateToken, async(req,res)=>{
  const { prompt, modelName = DEFAULT_GEMINI_MODEL, questionCount = 10, difficulty = 5 } = req.body;
  if (!prompt?.trim() || !isSupportedGeminiModel(modelName) ||
      !Number.isInteger(Number(questionCount)) || Number(questionCount) < 1 || Number(questionCount) > 50 ||
      !Number.isInteger(Number(difficulty)) || Number(difficulty) < 1 || Number(difficulty) > 10) {
    return res.status(400).json({ error: 'Invalid prompt, model, question count, or difficulty' });
  }
  try {
    const response = await geminiQueryRun(prompt, Number(questionCount), Number(difficulty), modelName, { user: req.user.id });
    res.type('json').send(response);
  } catch (error) {
    console.error('Gemini prompt failed:', error);
    res.status(502).json({ error: 'Question generation failed' });
  }
})


export default router;
