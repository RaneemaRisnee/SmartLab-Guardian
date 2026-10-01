const mongoose = require('mongoose');

/**
 * A lab PC. `lastHeartbeatAt` is refreshed by the monitoring agent, and the
 * dashboard treats a PC with a stale heartbeat as offline.
 */
const computerSchema = new mongoose.Schema(
  {
    pcNumber: {
      type: String,
      required: [true, 'PC number is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true, index: true },
    hostname: { type: String, trim: true },
    ipAddress: { type: String, trim: true },
    macAddress: { type: String, trim: true, uppercase: true },
    status: {
      type: String,
      enum: ['available', 'in-use', 'offline', 'maintenance'],
      default: 'offline',
      index: true
    },
    specs: {
      cpu: { type: String, trim: true },
      ramGb: { type: Number, min: 0 },
      storageGb: { type: Number, min: 0 },
      os: { type: String, trim: true }
    },
    agentVersion: { type: String, trim: true },
    lastHeartbeatAt: { type: Date },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

/** Minutes since the agent last checked in, or null if it never has. */
computerSchema.virtual('minutesSinceHeartbeat').get(function minutesSince() {
  if (!this.lastHeartbeatAt) return null;
  return Math.round((Date.now() - this.lastHeartbeatAt.getTime()) / 60000);
});

computerSchema.set('toJSON', { virtuals: true });
computerSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Computer', computerSchema);
