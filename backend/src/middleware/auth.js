const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/** Signs the token handed to a staff user after a successful dashboard login. */
function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  });
}

/** Rejects the request unless it carries a valid, non-expired staff token. */
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing bearer token');
  }

  let payload;
  try {
    payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch (err) {
    throw ApiError.unauthorized('Session expired or token is invalid');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Account is no longer active');
  }

  req.user = user;
  next();
});

/**
 * Restricts a route to the listed roles. Admins are deliberately not given a
 * blanket pass — each route lists every role it accepts, so the permission
 * matrix stays readable.
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`This action is limited to: ${roles.join(', ')}`));
    }
    next();
  };
}

module.exports = { protect, authorize, signToken };
