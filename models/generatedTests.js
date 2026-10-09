import mongoose from 'mongoose';

const testSchema = new mongoose.Schema({
  testID: 
  {
    type: String,
    required: true,
    unique: true
  },
  response: {
    type: Object,
    required: true
  },
  generation: { type: mongoose.Schema.Types.Mixed },
  grounding: { type: mongoose.Schema.Types.Mixed },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'usersData',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  }
});

const generatedTests = mongoose.model('generatedTests', testSchema);

export default generatedTests;
