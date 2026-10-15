const mongoose = require('mongoose');

/**
 * A single piece of lab equipment. Devices attached to a PC are matched by
 * `serialNumber` against what the agent reports during a hardware scan.
 */
const hardwareDeviceSchema = new mongoose.Schema(
  {
    hardwareId: {
      type: String,
      required: [true, 'Hardware ID is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    computer: { type: mongoose.Schema.Types.ObjectId, ref: 'Computer', index: true },
    lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', index: true },
    deviceType: {
      type: String,
      enum: ['keyboard', 'mouse', 'monitor', 'system-unit', 'storage', 'headset', 'webcam', 'ups', 'other'],
      required: true,
      index: true
    },
    vendor: { type: String, trim: true },
    model: { type: String, trim: true },
    serialNumber: { type: String, trim: true, index: true },
    condition: {
      type: String,
      enum: ['new', 'good', 'fair', 'damaged'],
      default: 'good'
    },
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'missing', 'in-store', 'retired'],
      default: 'in-store',
      index: true
    },
    location: { type: String, trim: true },
    purchaseDate: { type: Date },
    lastSeenAt: { type: Date },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

hardwareDeviceSchema.index({ computer: 1, deviceType: 1 });

module.exports = mongoose.model('HardwareDevice', hardwareDeviceSchema);
