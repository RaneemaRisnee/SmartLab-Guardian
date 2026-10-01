const mongoose = require('mongoose');

/**
 * A snapshot of a generated report, saved so staff can reopen exactly what
 * they looked at instead of re-running a query over changed data.
 */
const usageReportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    reportType: {
      type: String,
      enum: ['usage', 'attendance', 'hardware', 'exam'],
      required: true,
      index: true
    },
    scope: {
      lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' },
      dateFrom: { type: Date },
      dateTo: { type: Date }
    },
    summary: { type: mongoose.Schema.Types.Mixed, default: {} },
    rows: { type: [mongoose.Schema.Types.Mixed], default: [] },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    generatedAt: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('UsageReport', usageReportSchema);
