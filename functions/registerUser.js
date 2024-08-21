import usersData from '../models/usersData.js';
import bcrypt from 'bcrypt';

const registerUser = async (email, password, username) => {
    try {
        // Check if the email already exists
        const existingUser = await usersData.findOne({ email });
  
        if (existingUser) {
            throw new Error('Email already registered');
        }
  
        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);
  
        // Create an instance of users with the extracted data
        const newUser = new usersData({
            email,
            password: hashedPassword,
            userName: username
        });
  
        // Save the data to the database
        await newUser.save();
    } catch (error) {
        console.error('Error saving data:', error);
        throw error; // Re-throw the error to be handled by the calling function
    }
  };

  export default registerUser;