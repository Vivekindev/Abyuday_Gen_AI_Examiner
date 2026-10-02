import { Router } from 'express';
import { generateAccessToken, generateRefreshToken } from '../functions/authFunctions.js';
import { setAuthCookies } from '../functions/authCookies.js';
import authenticateUser from '../functions/authenticateUser.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' ||
      email.length > 254 || !email.includes('@') || !password) {
    return res.status(400).json({ message: 'Enter a valid email and password.' });
  }
  try {
    const user = await authenticateUser(email, password);
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });
    req.user = { id: user.id, email: user.email };
    req.activity = { action: 'auth.login' };
    const identity = { email: user.email, version: user.tokenVersion || 0 };
    setAuthCookies(res, user, generateAccessToken(identity), generateRefreshToken(identity));
    return res.status(200).json({ user: { id: user.id, email: user.email, name: user.userName } });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({ message: 'Login is unavailable. Try again.' });
  }
});

export default router;
