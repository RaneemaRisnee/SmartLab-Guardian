const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Staff account used to sign in to the dashboard.
 * Roles map to the proposal: admin, lecturer, examiner.
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email address is not valid']
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['admin', 'lecturer', 'examiner'],
      required: true,
      default: 'lecturer'
    },
    department: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date }
  },
  { timestamps: true }
);

/** Accepts a plain password on `user.password` and stores only the hash. */
userSchema.virtual('password').set(function setPassword(plain) {
  this._plainPassword = plain;
});

// Hashed on validate, not save: validation runs first, and `passwordHash` is
// a required path, so hashing any later would fail a brand new document.
userSchema.pre('validate', async function hashPassword(next) {
  if (!this._plainPassword) return next();
  this.passwordHash = await bcrypt.hash(this._plainPassword, 10);
  this._plainPassword = undefined;
  next();
});

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
