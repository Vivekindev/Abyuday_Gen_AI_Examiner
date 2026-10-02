import jwt from 'jsonwebtoken';
import usersData from '../models/usersData.js';
import { authCookieOptions } from './authCookies.js';

export const generateAccessToken = (identity) =>
  jwt.sign(identity, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

export const generateRefreshToken = (identity) =>
  jwt.sign(identity, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

export const authenticateToken = async (req, res, next) => {
  const accessToken = req.cookies?.accessToken;
  const refreshToken = req.cookies?.refreshToken;
  let identity;
  let refreshed = false;
  try {
    if (accessToken) identity = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    if (error.name !== 'TokenExpiredError') return res.sendStatus(401);
  }
  if (!identity) {
    if (!refreshToken) return res.sendStatus(401);
    try { identity = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET); refreshed = true; }
    catch { return res.sendStatus(401); }
  }
  if (!identity?.email) return res.sendStatus(401);
  try {
    const user = await usersData.findOne({ email: identity.email }).select('email tokenVersion');
    if (!user || (identity.version || 0) !== (user.tokenVersion || 0)) return res.sendStatus(401);
    req.user = { email: user.email, id: user.id };
    if (refreshed) {
      res.cookie('accessToken', generateAccessToken({ email: user.email, version: user.tokenVersion || 0 }), {
        ...authCookieOptions, maxAge: 15 * 60 * 1000,
      });
    }
    return next();
  } catch (error) { return next(error); }
};
