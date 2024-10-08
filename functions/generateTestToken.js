import jwt from 'jsonwebtoken';

export const generateTestToken = (email, testID, expiry) => {
    
    return jwt.sign( {email : email, testID : testID} , process.env.TEST_TOKEN_SECRET, { expiresIn: `${expiry}m` });
};
  