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
  isEnded: {
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
  expiryTime: {
    type: Date,     
    required: true
  },
  timeAlloted:{
    type: Number,
    required: true
  },
  results:{
    type: Object
  },
  selectedOptions:{
    type: Object
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'usersData',
    required: true
  }
});

const testWindowSchema = mongoose.model('TestWindow', testSchema);

export default testWindowSchema;
