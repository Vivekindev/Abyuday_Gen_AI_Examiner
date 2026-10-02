import { Router } from 'express';
import { authenticateToken } from '../functions/authFunctions.js';
import { clearAuthCookies } from '../functions/authCookies.js';
import usersData from '../models/usersData.js';

const router = Router();

router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    await usersData.updateOne({ email: req.user.email }, { $inc: { tokenVersion: 1 } });
    clearAuthCookies(res);
    req.activity = { action: 'auth.logout' };
    res.sendStatus(204);
  } catch (error) { next(error); }
});

export default router;
