import { Router } from 'express';
import { generateAccessToken, generateRefreshToken } from '../functions/authFunctions.js';
import { setAuthCookies } from '../functions/authCookies.js';
import registerUser from '../functions/registerUser.js';

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body || {};
  if (typeof username !== 'string' || username.trim().length < 2 || username.length > 80 ||
      typeof email !== 'string' || email.length > 254 || !emailPattern.test(email) ||
      typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ message: 'Enter a name, valid email, and password of at least 8 characters.' });
  }
  try {
    const user = await registerUser(email, password, username);
    req.user = { id: user.id, email: user.email };
    req.activity = { action: 'auth.register' };
    const identity = { email: user.email, version: user.tokenVersion || 0 };
    setAuthCookies(res, user, generateAccessToken(identity), generateRefreshToken(identity));
    return res.sendStatus(201);
  } catch (error) {
    if (error.message === 'Email already registered' || error.code === 11000) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    console.error('Registration failed:', error);
    return res.status(500).json({ message: 'Registration is unavailable. Try again.' });
  }
});

export default router;
