import { Router } from 'express';
import {generateAccessToken, generateRefreshToken} from '../functions/authFunctions.js';
import authenticateUser from '../functions/authenticateUser.js';

const router = Router();

router.post('/login', async(req,res)=>{
    const { email, password } = req.body;

    try {
      const user = await authenticateUser(email, password);
      
      if (user) {
        const accessToken = generateAccessToken({ email: user.email });
        const refreshToken = generateRefreshToken({ email: user.email });
        res.cookie('accessToken', accessToken, { httpOnly: true, sameSite: 'Strict'});
        res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'Strict'});
        res.sendStatus(200);
      } else {
        res.sendStatus(401); // Unauthorized
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
   
})


export default router;