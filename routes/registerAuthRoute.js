import { Router } from 'express';
import {generateAccessToken, generateRefreshToken, authenticateToken} from '../functions/authFunctions.js';
import registerUser from '../functions/registerUser.js';

const router = Router();

router.post('/register',async(req,res)=>{

    const {username, email, password } = req.body;
    try {
      await registerUser(email, password , username);
      const accessToken = generateAccessToken( {email} );
      const refreshToken = generateRefreshToken({email} );
      res.cookie('accessToken', accessToken, { httpOnly: true, sameSite: 'Strict'});
      res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'Strict'});
      res.sendStatus(200);
    } 
    catch (error) {
      if (error.message === 'Email already registered') {
        res.status(409).json({ message: error.message }); // 409 Conflict
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }

});


export default router;