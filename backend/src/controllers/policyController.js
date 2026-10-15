const { Lab, MonitoringPolicy } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/** Accepts either an array or a comma separated string from the form. */
function toList(value) {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

/** GET /api/policies - the global default plus any lab overrides. */
exports.list = asyncHandler(async (req, res) => {
  const policies = await MonitoringPolicy.find()
    .populate('lab', 'code name')
    .populate('updatedBy', 'name role')
    .sort({ lab: 1 });

  res.json({ success: true, data: policies });
});

/** GET /api/policies/effective?lab=<id> - what actually applies to a lab. */
exports.effective = asyncHandler(async (req, res) => {
  const policy = await MonitoringPolicy.resolveFor(req.query.lab || null);
  res.json({ success: true, data: policy });
});

/**
 * PUT /api/policies - upsert the policy for a lab, or the global default when
 * no lab is given. Lecturers use this to set the minimum activity level.
 */
exports.upsert = asyncHandler(async (req, res) => {
  const labId = req.body.lab || null;

  if (labId) {
    const lab = await Lab.findById(labId);
    if (!lab) throw ApiError.badRequest('Lab not found');
  }

  const update = { updatedBy: req.user._id };
  const numeric = [
    'minActiveMinutes',
    'idleThresholdSeconds',
    'hardwareScanIntervalMinutes',
    'heartbeatTimeoutMinutes'
  ];

  for (const key of numeric) {
    if (req.body[key] !== undefined) {
      const value = Number(req.body[key]);
      if (Number.isNaN(value) || value < 0) {
        throw ApiError.badRequest(`${key} must be a positive number`);
      }
      update[key] = value;
    }
  }

  for (const key of ['requiredApps', 'blockedApps', 'blockedDomains']) {
    const list = toList(req.body[key]);
    if (list !== undefined) update[key] = list;
  }

  const policy = await MonitoringPolicy.findOneAndUpdate(
    { lab: labId },
    { $set: update, $setOnInsert: { lab: labId } },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  ).populate('lab', 'code name');

  res.json({ success: true, data: policy });
});

/** DELETE /api/policies/:id - drop a lab override so it falls back to global. */
exports.remove = asyncHandler(async (req, res) => {
  const policy = await MonitoringPolicy.findById(req.params.id);
  if (!policy) throw ApiError.notFound('Policy not found');

  if (policy.lab === null) {
    throw ApiError.badRequest('The global default policy cannot be deleted');
  }

  await policy.deleteOne();
  res.json({ success: true, message: 'Lab policy removed; the global default now applies' });
});
