const mongoose = require('mongoose');

const summarySchema = new mongoose.Schema({
  current_status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'SESSION_ENDED'], default: 'INACTIVE' },
  last_activity_at: { type: Date, default: null },
  active_seconds: { type: Number, min: 0, default: 0 },
  inactive_seconds: { type: Number, min: 0, default: 0 },
  transition_count: { type: Number, min: 0, default: 0 },
}, { _id: false });

const monitoringSessionSchema = new mongoose.Schema({
  // Supplied by the already-authorized session owner, never generated from
  // untrusted monitoring data.
  session_id: { type: String, required: true, trim: true, maxlength: 128 },
  pc_id: { type: String, required: true, trim: true, maxlength: 128 },
  status: { type: String, enum: ['active', 'ended'], default: 'active' },
  started_at: { type: Date, required: true },
  ended_at: { type: Date, default: null },
  summary: { type: summarySchema, default: () => ({}) },
}, { timestamps: true });

monitoringSessionSchema.index({ session_id: 1 }, { unique: true });
monitoringSessionSchema.index({ pc_id: 1, started_at: -1 });

module.exports = mongoose.model('MonitoringSession', monitoringSessionSchema);
