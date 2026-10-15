const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../middleware/auth');

/** POST /api/auth/login - staff sign in (admin, lecturer, examiner). */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw ApiError.badRequest('Email and password are required');
  }

  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+passwordHash');

  // Same message either way so the form cannot be used to discover accounts.
  if (!user || !(await user.verifyPassword(password))) {
    throw ApiError.unauthorized('Email or password is incorrect');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated');
  }

  user.lastLoginAt = new Date();
  await user.save();

  res.json({
    success: true,
    data: {
      token: signToken(user),
      user: user.toJSON()
    }
  });
});

/** GET /api/auth/me - the signed-in user, used to restore a session on reload. */
exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user.toJSON() });
});

/** POST /api/auth/users - admin creates a staff account. */
exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, department } = req.body;

  if (!password || password.length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters');
  }

  const user = new User({ name, email, role, department });
  user.password = password;
  await user.save();

  res.status(201).json({ success: true, data: user.toJSON() });
});

/** GET /api/auth/users - admin lists staff accounts. */
exports.listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ success: true, data: users });
});

/** PUT /api/auth/users/:id - admin updates a staff account. */
exports.updateUser = asyncHandler(async (req, res) => {
  const { name, role, department, isActive } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  if (name !== undefined) user.name = name;
  if (role !== undefined) user.role = role;
  if (department !== undefined) user.department = department;
  if (isActive !== undefined) user.isActive = isActive;

  await user.save();
  res.json({ success: true, data: user.toJSON() });
});

/** PUT /api/auth/password - change your own password. */
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    throw ApiError.badRequest('New password must be at least 8 characters');
  }

  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await user.verifyPassword(currentPassword || ''))) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: 'Password updated' });
});
