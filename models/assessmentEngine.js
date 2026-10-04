import mongoose from 'mongoose';

const engineSchema = new mongoose.Schema({
  scope: { type: String, required: true },
  key: { type: String, required: true },
  status: { type: String, enum: ['building', 'ready', 'failed'], required: true },
  definition: mongoose.Schema.Types.Mixed,
  buildToken: String,
  leaseUntil: Date,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'usersData', required: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
}, { timestamps: true });
engineSchema.index({ scope: 1, key: 1 }, { unique: true });
export const AssessmentEngine = mongoose.model('AssessmentEngine', engineSchema);

const requestSchema = new mongoose.Schema({
  scope: { type: String, required: true },
  testID: { type: String, required: true },
  slot: { type: Number, required: true },
  key: { type: String, required: true },
  domain: String,
  objective: String,
  requirement: String,
  status: { type: String, enum: ['requested', 'building', 'ready', 'reused', 'failed', 'unsupported', 'adapted'], default: 'requested' },
  message: String,
  engine: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentEngine' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'usersData', required: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
}, { timestamps: true });
requestSchema.index({ scope: 1, testID: 1, slot: 1 }, { unique: true });
requestSchema.index({ scope: 1, createdAt: -1 });
export const EngineRequest = mongoose.model('EngineRequest', requestSchema);
