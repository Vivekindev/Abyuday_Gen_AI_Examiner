import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  testID: {
    type: String,
    required: true
  },
  testName: {
    type: String,
    required: true
  },
  testPrompt: {
    type: String,
    required: true
  },
  questionCount: {
    type: String,
    required: true
  },
  testDifficulty: {
    type: String,
    required: true
  },
  testModel: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: "Queued"
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'usersData',
    required: true
  }
});

const pendingTasksDB = mongoose.model('pendingTasks', taskSchema);

export default pendingTasksDB;
