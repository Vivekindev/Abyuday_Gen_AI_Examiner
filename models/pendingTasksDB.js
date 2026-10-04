import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  testID: {
    type: String,
    required: true,
    unique: true
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
  retryCount: {
    type: Number,
    default: 0
  },
  generationAttempt: { type: Number, default: 0 },
  nextAttemptAt: Date,
  assessmentMode: { type: String, enum: ['mcq', 'interactive'], default: 'mcq' },
  generationStage: { type: String, default: 'queued' },
  generationPlan: { type: mongoose.Schema.Types.Mixed },
  generationQuestions: { type: [mongoose.Schema.Types.Mixed], default: undefined, select: false },
  generationError: { type: mongoose.Schema.Types.Mixed },
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

const pendingTasksDB = mongoose.model('pendingTasks', taskSchema);

export default pendingTasksDB;
