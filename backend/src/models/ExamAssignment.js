const mongoose = require('mongoose');

/**
 * Binds one student to one PC for one exam. Produced by the auto-assignment
 * step, then consumed by the agent when it signs the student in.
 */
const examAssignmentSchema = new mongoose.Schema(
  {
    examSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamSession',
      required: true,
      index: true
    },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    computer: { type: mongoose.Schema.Types.ObjectId, ref: 'Computer', required: true },
    seatNumber: { type: String, trim: true },
    assignedAt: { type: Date, default: Date.now },
    signInStatus: {
      type: String,
      enum: ['pending', 'signed-in', 'signed-out', 'absent'],
      default: 'pending',
      index: true
    },
    signedInAt: { type: Date },
    signedOutAt: { type: Date },
    loginSession: { type: mongoose.Schema.Types.ObjectId, ref: 'LoginSession' }
  },
  { timestamps: true }
);

// One seat per student, and one student per PC, within a single exam.
examAssignmentSchema.index({ examSession: 1, student: 1 }, { unique: true });
examAssignmentSchema.index({ examSession: 1, computer: 1 }, { unique: true });

module.exports = mongoose.model('ExamAssignment', examAssignmentSchema);
