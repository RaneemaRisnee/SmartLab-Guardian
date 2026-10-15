const mongoose = require('mongoose');

/** A physical computer laboratory. Everything else hangs off a lab. */
const labSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Lab code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    name: { type: String, required: [true, 'Lab name is required'], trim: true },
    location: { type: String, trim: true },
    capacity: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lab', labSchema);
