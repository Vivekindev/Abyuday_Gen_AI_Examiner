import usersData from '../models/usersData.js';
import bcrypt from 'bcryptjs';

const authenticateUser = async (email, password) => {
  try {
      // Find the user by email
      const user = await usersData.findOne({ email: email.trim().toLowerCase() });
      
      if (!user) {
          return null;
      }

      // Compare the provided password with the hashed password stored in the database
      const isMatch = /^\$2[aby]\$/.test(user.password || '') && await bcrypt.compare(password, user.password);
      if (!isMatch) {
          return null;
      }

      // Return user data if authentication is successful
      return user;
  } catch (error) {
      console.error('Error during authentication:', error);
      throw error;
  }
};


export default authenticateUser;
