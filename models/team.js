import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'usersData', required: true },
  role: { type: String, enum: ['owner', 'admin', 'member'], required: true },
  joinedAt: { type: Date, default: Date.now },
}, { _id: false });

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  members: { type: [memberSchema], default: [] },
  deletingAt: { type: Date, default: null },
  deletionToken: { type: String, default: null, select: false },
  deletionLeaseUntil: { type: Date, default: null, select: false },
}, { timestamps: true });

teamSchema.index({ 'members.user': 1 });

export default mongoose.model('Team', teamSchema);
