import usersData from '../models/usersData.js';
import bcrypt from 'bcrypt';

const authenticateUser = async (email, password) => {
  try {
      // Find the user by email
      const user = await usersData.findOne({ email });
      
      if (!user) {
          throw new Error('User not found');
      }

      // Compare the provided password with the hashed password stored in the database
      const isMatch = await bcrypt.compare(password, user.password);
      console.log(user.password);
      if (!isMatch) {
          throw new Error('Invalid password');
      }

      // Return user data if authentication is successful
      return user;
  } catch (error) {
      console.error('Error during authentication:', error);
      throw error;
  }
};


export default authenticateUser;
