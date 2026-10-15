const mongoose = require('mongoose');

/**
 * One student's sitting at one PC. This is the spine of the system: attendance,
 * usage reports and misuse detection all hang off a session.
 */
const loginSessionSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    computer: { type: mongoose.Schema.Types.ObjectId, ref: 'Computer', required: true, index: true },
    lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true, index: true },
    sessionType: { type: String, enum: ['lab', 'exam'], default: 'lab' },
    examSession: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamSession' },
    loginTime: { type: Date, default: Date.now, index: true },
    logoutTime: { type: Date },
    lastActivityAt: { type: Date, default: Date.now },
    activeSeconds: { type: Number, default: 0, min: 0 },
    idleSeconds: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['active', 'ended', 'terminated'],
      default: 'active',
      index: true
    },
    flagged: { type: Boolean, default: false, index: true },
    flagReasons: [{ type: String }],
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNote: { type: String, trim: true }
  },
  { timestamps: true }
);

// A student should only ever hold one open session; used to catch shared logins.
loginSessionSchema.index({ student: 1, status: 1 });
loginSessionSchema.index({ lab: 1, loginTime: -1 });

/** Wall-clock length of the session in seconds (running sessions use now). */
loginSessionSchema.virtual('durationSeconds').get(function duration() {
  const end = this.logoutTime ? this.logoutTime.getTime() : Date.now();
  return Math.max(Math.round((end - this.loginTime.getTime()) / 1000), 0);
});

loginSessionSchema.set('toJSON', { virtuals: true });
loginSessionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('LoginSession', loginSessionSchema);
