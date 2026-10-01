const mongoose = require('mongoose');

/** A scheduled examination held in one lab. */
const examSessionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: [true, 'Exam name is required'], trim: true },
    lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true, index: true },
    examDate: { type: Date, required: true, index: true },
    startTime: { type: String, required: true, trim: true }, // "09:00"
    endTime: { type: String, required: true, trim: true }, // "11:00"
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'active', 'completed', 'cancelled'],
      default: 'draft',
      index: true
    },
    autoSignIn: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ExamSession', examSessionSchema);
