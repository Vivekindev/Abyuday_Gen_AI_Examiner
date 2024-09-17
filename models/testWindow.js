import mongoose from 'mongoose';

const testSchema = new mongoose.Schema({
  testID: {
    type: String,
    required: true
  },
  isOngoing: {
    type: Boolean,  
    required: true,
    default: false
  },
  isended: {
    type: Boolean,  
    required: true,
    default: false
  },
  flagCount: {
    type: Number,   
    default: 0
  },
  startTime: {
    type: Date,     
    required: true
  },
  timeAlloted:{
    type: Number,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'usersData',
    required: true
  }
});

const testWindowSchema = mongoose.model('TestWindow', testSchema);

export default testWindowSchema;
