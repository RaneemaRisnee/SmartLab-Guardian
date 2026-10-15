const mongoose = require('mongoose');

/** One stretch of foreground time in a single application, reported by the agent. */
const applicationUsageSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoginSession',
      required: true,
      index: true
    },
    appName: { type: String, required: true, trim: true, index: true },
    windowTitle: { type: String, trim: true },
    category: {
      type: String,
      enum: ['productivity', 'development', 'browser', 'media', 'game', 'system', 'other'],
      default: 'other'
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    durationSeconds: { type: Number, default: 0, min: 0 },
    blocked: { type: Boolean, default: false }
  },
  { timestamps: true }
);

applicationUsageSchema.index({ session: 1, appName: 1 });

module.exports = mongoose.model('ApplicationUsage', applicationUsageSchema);
