import { Router } from 'express';
import { generateAccessToken, generateRefreshToken } from '../functions/authFunctions.js';
import authenticateUser from '../functions/authenticateUser.js';
import crypto from 'crypto';

const router = Router();

// Middleware to attach a nonce to the session
const attachNonce = (req, res, next) => {
    if (!req.session.nonce) {
        req.session.nonce = crypto.randomBytes(16).toString('hex');
    }
    next();
};

router.post('/login', attachNonce, async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await authenticateUser(email, password);
      
        if (user) {
            const nonce = req.session.nonce;
            const accessToken = generateAccessToken({ email: user.email, nonce });
            const refreshToken = generateRefreshToken({ email: user.email, nonce });

            res.cookie('username', user.userName, {
                httpOnly: false, 
                sameSite: 'Strict',
                secure: process.env.NODE_ENV === 'production',
            });

            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                sameSite: 'Strict',
                secure: process.env.NODE_ENV === 'production',
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                sameSite: 'Strict',
                secure: process.env.NODE_ENV === 'production',
            });

            res.sendStatus(200);
        } else {
            res.sendStatus(401); // Unauthorized
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
