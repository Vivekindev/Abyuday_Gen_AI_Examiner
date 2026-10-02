import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: 
  {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  userName : {
    type : String,
    
  },
  tokenVersion: { type: Number, default: 0 }
});

const usersData = mongoose.model('usersData', userSchema);

export default usersData;
