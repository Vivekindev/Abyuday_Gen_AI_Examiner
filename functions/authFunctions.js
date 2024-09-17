import jwt from 'jsonwebtoken';

// Middleware to authenticate token and refresh if expired
export const authenticateToken = (req, res, next) => {
  const accessToken = req.cookies['accessToken'];

  if (!accessToken) return res.sendStatus(401); 

  jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      const refreshToken = req.cookies['refreshToken'];
      if (err.name === 'TokenExpiredError' && refreshToken) {
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (refreshErr, refreshUser) => {

          if (refreshErr) return res.sendStatus(403); 
          const email = refreshUser.email;
          const newAccessToken = generateAccessToken({email});
          res.cookie('accessToken', newAccessToken, { httpOnly: true, sameSite: 'Strict',});
          req.user = refreshUser;
          next();
        });
      } else {
        return res.sendStatus(403);
      }
    } else {
      req.user = user;
      next();
    }
  });
};

// Function to generate access token
export const generateAccessToken = (email) => {
  return jwt.sign( email , process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
};

// Function to generate refresh token
export const generateRefreshToken = (email) => {
  return jwt.sign( email , process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
};
