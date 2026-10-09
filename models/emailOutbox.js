import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  event: { type: String, required: true },
  category: { type: String, enum: ['generation', 'team', 'invitation', 'security'], required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'usersData', default: null },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null, index: true },
  testID: { type: String, index: true },
  invite: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamInvite', default: null, index: true },
  requiresMembership: { type: Boolean, default: true },
  requiredRoles: { type: [String], enum: ['owner', 'admin', 'member'], default: [] },
  payload: { type: mongoose.Schema.Types.Mixed, select: false },
  status: { type: String, enum: ['pending', 'processing', 'sent', 'failed', 'cancelled'], default: 'pending' },
  attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date, default: Date.now },
  leaseToken: String,
  leasedUntil: Date,
  sentAt: Date,
  lastError: String,
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60_000) },
}, { timestamps: true });
schema.index({ status: 1, nextAttemptAt: 1, leasedUntil: 1 });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model('EmailOutbox', schema);
