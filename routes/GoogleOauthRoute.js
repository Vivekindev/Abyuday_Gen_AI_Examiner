import { Router } from 'express';
import passport from 'passport';
import { generateAccessToken, generateRefreshToken } from '../functions/authFunctions.js';
import { setAuthCookies } from '../functions/authCookies.js';
import crypto from 'node:crypto';
import { recordActivity } from '../functions/telemetry.js';
import connectDB from '../db/db.js';

const router = Router();
const validReturnTo = (value) => typeof value === 'string' && value.length <= 2048 && /^\/(dashboard(?:[/?]|$)|test\?|join\?)/.test(value);

router.get('/auth/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).send('Google sign-in is not configured.');
  }
  const state = crypto.randomBytes(24).toString('hex');
  res.cookie('oauthState', state, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000, path: '/',
  });
  const returnTo = req.query.returnTo;
  if (validReturnTo(returnTo)) {
    res.cookie('oauthReturnTo', returnTo, {
      httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000, path: '/',
    });
  }
  return passport.authenticate('google', { scope: ['profile', 'email'], state })(req, res, next);
});

const verifyOauthState = (req, res, next) => {
  const received = req.query.state;
  const expected = req.cookies?.oauthState;
  res.clearCookie('oauthState', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  if (typeof received !== 'string' || typeof expected !== 'string') return res.redirect('/login');
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.redirect('/login');
  return next();
};

const connectDatabase = async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
};

router.get('/auth/google/callback',
  verifyOauthState,
  connectDatabase,
  passport.authenticate('google', { session: false, failureRedirect: '/' }),
  (req, res) => {
    const identity = { email: req.user.email, version: req.user.tokenVersion || 0 };
    const accessToken = generateAccessToken(identity);
    const refreshToken = generateRefreshToken(identity);
    
    setAuthCookies(res, req.user, accessToken, refreshToken);
    recordActivity({ user: req.user._id, action: 'auth.login' });
    const returnTo = req.cookies?.oauthReturnTo;
    res.clearCookie('oauthReturnTo', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
    res.redirect(validReturnTo(returnTo) ? returnTo : '/dashboard');
  }
);

export default router;
