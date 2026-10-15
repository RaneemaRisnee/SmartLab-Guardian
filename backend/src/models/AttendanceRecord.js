const mongoose = require('mongoose');

/**
 * Attendance derived from a login session. Created the moment a student signs
 * in, then re-evaluated against the lab's minimum-activity policy as usage
 * data arrives, so a student who logs in and walks away is flagged rather than
 * silently marked present.
 */
const attendanceRecordSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoginSession',
      required: true,
      unique: true
    },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true, index: true },
    date: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['present', 'flagged', 'absent'],
      default: 'present',
      index: true
    },
    meetsMinActivity: { type: Boolean, default: false },
    activeMinutes: { type: Number, default: 0, min: 0 },
    requiredMinutes: { type: Number, default: 0, min: 0 },
    requiredAppsUsed: [{ type: String }],
    requiredAppsMissing: [{ type: String }],
    remarks: { type: String, trim: true },
    overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    overriddenAt: { type: Date }
  },
  { timestamps: true }
);

attendanceRecordSchema.index({ student: 1, date: -1 });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
