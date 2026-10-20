const mongoose = require('mongoose');

const appUsageSchema = new mongoose.Schema({
  app_name: { type: String, required: true, trim: true, maxlength: 128 },
  executable_name: { type: String, required: true, trim: true, maxlength: 260 },
  started_at: { type: Date, required: true },
  ended_at: { type: Date, required: true },
  duration_seconds: { type: Number, required: true, min: 0, max: 86400 },
}, { _id: false });

const activityChangeSchema = new mongoose.Schema({
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'SESSION_ENDED'], required: true },
  timestamp: { type: Date, required: true },
  last_activity_at: { type: Date, default: null },
}, { _id: false });

const summarySchema = new mongoose.Schema({
  current_status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'SESSION_ENDED'], required: true },
  last_activity_at: { type: Date, default: null },
  active_seconds: { type: Number, min: 0, required: true },
  inactive_seconds: { type: Number, min: 0, required: true },
  transition_count: { type: Number, min: 0, required: true },
}, { _id: false });

const monitoringBatchSchema = new mongoose.Schema({
  batch_id: { type: String, required: true, trim: true, maxlength: 64 },
  session_id: { type: String, required: true, trim: true, maxlength: 128 },
  pc_id: { type: String, required: true, trim: true, maxlength: 128 },
  app_usage: { type: [appUsageSchema], default: [] },
  activity_changes: { type: [activityChangeSchema], default: [] },
  summary: { type: summarySchema, required: true },
  final: { type: Boolean, default: false },
  ended_at: { type: Date, default: null },
}, { timestamps: true });

monitoringBatchSchema.index({ batch_id: 1 }, { unique: true });
monitoringBatchSchema.index({ session_id: 1, createdAt: 1 });

module.exports = mongoose.model('MonitoringBatch', monitoringBatchSchema);
