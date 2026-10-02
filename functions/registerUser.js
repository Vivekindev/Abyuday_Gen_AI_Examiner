import usersData from '../models/usersData.js';
import bcrypt from 'bcryptjs';

const registerUser = async (email, password, username) => {
    try {
        // Check if the email already exists
        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await usersData.findOne({ email: normalizedEmail });
  
        if (existingUser) {
            throw new Error('Email already registered');
        }
  
        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);
  
        // Create an instance of users with the extracted data
        const newUser = new usersData({
            email: normalizedEmail,
            password: hashedPassword,
            userName: username.trim()
        });
  
        // Save the data to the database
        await newUser.save();
        return newUser;
    } catch (error) {
        console.error('Error saving data:', error);
        throw error; // Re-throw the error to be handled by the calling function
    }
  };

  export default registerUser;
