const secure = process.env.NODE_ENV === 'production';

export const authCookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure,
  path: '/',
};

export const setAuthCookies = (res, user, accessToken, refreshToken) => {
  res.cookie('username', user.userName || 'User', {
    sameSite: 'strict', secure, path: '/', maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.cookie('accessToken', accessToken, {
    ...authCookieOptions, maxAge: 15 * 60 * 1000,
  });
  res.cookie('refreshToken', refreshToken, {
    ...authCookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearAuthCookies = (res) => {
  res.clearCookie('username', { sameSite: 'strict', secure, path: '/' });
  res.clearCookie('accessToken', authCookieOptions);
  res.clearCookie('refreshToken', authCookieOptions);
};
