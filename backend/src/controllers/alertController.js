const { HardwareDevice, HardwareRemovalAlert } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { buildDateRange } = require('../utils/dates');

/** GET /api/alerts - hardware removal alerts, newest first. */
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.query.lab) filter.lab = req.query.lab;
  if (req.query.computer) filter.computer = req.query.computer;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.severity) filter.severity = req.query.severity;

  const range = buildDateRange(req.query.from, req.query.to);
  if (range) filter.removalTime = range;

  const [items, total] = await Promise.all([
    HardwareRemovalAlert.find(filter)
      .populate('computer', 'pcNumber')
      .populate('lab', 'code name')
      .populate('hardwareDevice', 'hardwareId deviceType vendor model serialNumber')
      .populate('reviewedBy', 'name role')
      .populate('activeSessionStudent', 'regNo name')
      .sort({ removalTime: -1 })
      .skip(skip)
      .limit(limit),
    HardwareRemovalAlert.countDocuments(filter)
  ]);

  res.json({ success: true, data: paginatedResponse(items, total, { page, limit }) });
});

/** GET /api/alerts/summary - counts used by the dashboard badge. */
exports.summary = asyncHandler(async (req, res) => {
  const [byStatus, bySeverity] = await Promise.all([
    HardwareRemovalAlert.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    HardwareRemovalAlert.aggregate([
      { $match: { status: 'open' } },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ])
  ]);

  const toMap = (rows) => rows.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {});

  res.json({ success: true, data: { byStatus: toMap(byStatus), openBySeverity: toMap(bySeverity) } });
});

/**
 * PUT /api/alerts/:id - the admin responds to an alert.
 *
 * Resolving an alert also settles the device: 'resolved' means the equipment
 * is genuinely gone (marked missing), 'false-alarm' means it is back in place.
 */
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, resolutionNote } = req.body;

  if (!['open', 'acknowledged', 'resolved', 'false-alarm'].includes(status)) {
    throw ApiError.badRequest('Status must be open, acknowledged, resolved or false-alarm');
  }

  const alert = await HardwareRemovalAlert.findById(req.params.id);
  if (!alert) throw ApiError.notFound('Alert not found');

  alert.status = status;
  alert.resolutionNote = resolutionNote;
  alert.reviewedBy = req.user._id;
  alert.reviewedAt = new Date();
  await alert.save();

  if (status === 'resolved') {
    await HardwareDevice.findByIdAndUpdate(alert.hardwareDevice, { $set: { status: 'missing' } });
  } else if (status === 'false-alarm') {
    await HardwareDevice.findByIdAndUpdate(alert.hardwareDevice, {
      $set: { status: 'connected', lastSeenAt: new Date() }
    });
  }

  const populated = await HardwareRemovalAlert.findById(alert._id)
    .populate('computer', 'pcNumber')
    .populate('hardwareDevice', 'hardwareId deviceType vendor model')
    .populate('reviewedBy', 'name role');

  res.json({ success: true, data: populated });
});
