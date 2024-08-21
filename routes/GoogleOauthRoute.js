import { Router } from 'express';
import passport from 'passport';
import {generateAccessToken, generateRefreshToken} from '../functions/authFunctions.js';

const router = Router();

// Google OAuth routes
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/' }),
  (req, res) => {
    const accessToken = generateAccessToken({ email: req.user.email });
    const refreshToken = generateRefreshToken({ email: req.user.email });
    res.cookie('accessToken', accessToken);
    res.cookie('refreshToken', refreshToken);
    res.redirect(`/dashboard`);
  }
);

export default router;
