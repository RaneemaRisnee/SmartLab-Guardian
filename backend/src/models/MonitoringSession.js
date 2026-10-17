const mongoose = require('mongoose');

/** A lecturer-controlled monitoring window for one lab. Student/PC sessions are linked automatically by the agent. */
const monitoringSessionSchema = new mongoose.Schema(
  {
    lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true, index: true },
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startedAt: { type: Date, default: Date.now, index: true },
    endedAt: { type: Date },
    status: { type: String, enum: ['active', 'ended'], default: 'active', index: true }
  },
  { timestamps: true }
);

monitoringSessionSchema.index({ lab: 1, status: 1 });
monitoringSessionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('MonitoringSession', monitoringSessionSchema);
