const mongoose = require('mongoose');

// NOTE: pc_id / hardware_id are Strings for now because the Computer and
// HardwareDevice collections belong to other members. When they are merged,
// change these two to { type: mongoose.Schema.Types.ObjectId, ref: 'Computer' / 'HardwareDevice' }.
const hardwareRemovalAlertSchema = new mongoose.Schema(
  {
    pc_id: { type: String, required: true, trim: true },         // e.g. "LAB-01-PC-12"
    hardware_id: { type: String, required: true, trim: true },   // Windows PNPDeviceID of the device
    device_name: { type: String, required: true, trim: true },   // e.g. "HID-compliant mouse"
    device_type: { type: String, default: 'Other', trim: true }, // Mouse, Keyboard, Monitor, Disk, USB
    removal_time: { type: Date, default: Date.now },
    resolved_status: {
      type: String,
      enum: ['Pending', 'Reviewed', 'Dismissed'],
      default: 'Pending',
    },
    reviewed_by: { type: String, default: null },                // admin id (after login module is ready)
    reviewed_time: { type: Date, default: null },
  },
  { timestamps: true }
);

// Fast lookups for the dashboard and for duplicate checks
hardwareRemovalAlertSchema.index({ removal_time: -1 });
hardwareRemovalAlertSchema.index({ pc_id: 1, hardware_id: 1, resolved_status: 1 });

module.exports = mongoose.model('HardwareRemovalAlert', hardwareRemovalAlertSchema);
