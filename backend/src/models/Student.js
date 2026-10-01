const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * A student who signs in to a lab PC. Kept separate from staff `User`
 * accounts because students never reach the dashboard - they are only
 * authenticated by the monitoring agent on the PC itself.
 */
const studentSchema = new mongoose.Schema(
  {
    regNo: {
      type: String,
      required: [true, 'Registration number is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email address is not valid']
    },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    department: { type: String, trim: true, default: 'Physical Science' },
    batch: { type: String, trim: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

studentSchema.index({ name: 'text', regNo: 'text', email: 'text' });

studentSchema.virtual('password').set(function setPassword(plain) {
  this._plainPassword = plain;
});

studentSchema.pre('validate', function defaultUsername(next) {
  // Lab logins use the registration number in lowercase with separators
  // stripped, e.g. 2021/ICT/128 -> 2021ict128, matching the university logins.
  if (!this.username && this.regNo) {
    this.username = this.regNo.replace(/[^a-z0-9]/gi, '').toLowerCase();
  }
  next();
});

// Hashed on validate, not save: validation runs first, and `passwordHash` is
// a required path, so hashing any later would fail a brand new document.
studentSchema.pre('validate', async function hashPassword(next) {
  if (!this._plainPassword) return next();
  this.passwordHash = await bcrypt.hash(this._plainPassword, 10);
  this._plainPassword = undefined;
  next();
});

studentSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

studentSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    return ret;
  }
});

module.exports = mongoose.model('Student', studentSchema);
