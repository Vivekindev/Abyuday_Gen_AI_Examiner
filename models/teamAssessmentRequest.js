import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'usersData', required: true },
  title: { type: String, required: true, trim: true, maxlength: 80 },
  topic: { type: String, required: true, trim: true, maxlength: 2000 },
  questionCount: { type: Number, required: true, min: 1, max: 50 },
  difficulty: { type: Number, required: true, min: 1, max: 10 },
  status: { type: String, enum: ['open', 'in_progress', 'fulfilled', 'declined'], default: 'open' },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'usersData', default: null },
}, { timestamps: true });

export default mongoose.model('TeamAssessmentRequest', schema);
