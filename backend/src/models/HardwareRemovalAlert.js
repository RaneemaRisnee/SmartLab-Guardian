const mongoose = require('mongoose');

/**
 * Raised when a hardware scan finds a registered device no longer attached to
 * the PC it belongs to. Carries the PC, device, date and removal time the
 * proposal calls for, plus the admin review trail.
 */
const hardwareRemovalAlertSchema = new mongoose.Schema(
  {
    hardwareDevice: { type: mongoose.Schema.Types.ObjectId, ref: 'HardwareDevice', required: true },
    computer: { type: mongoose.Schema.Types.ObjectId, ref: 'Computer', required: true, index: true },
    lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', index: true },
    deviceType: { type: String, required: true },
    deviceLabel: { type: String, trim: true },
    removalTime: { type: Date, required: true, default: Date.now, index: true },
    detectedAt: { type: Date, required: true, default: Date.now },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium', index: true },
    status: {
      type: String,
      enum: ['open', 'acknowledged', 'resolved', 'false-alarm'],
      default: 'open',
      index: true
    },
    activeSessionStudent: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    resolutionNote: { type: String, trim: true }
  },
  { timestamps: true }
);

hardwareRemovalAlertSchema.index({ status: 1, removalTime: -1 });

module.exports = mongoose.model('HardwareRemovalAlert', hardwareRemovalAlertSchema);
