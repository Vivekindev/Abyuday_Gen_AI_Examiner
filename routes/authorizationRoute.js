import { Router } from 'express';
import { authenticateToken } from '../functions/authFunctions.js';

const router = Router();

router.post('/auth/check',authenticateToken, async(req,res)=>{
res.sendStatus(200);
})


export default router;