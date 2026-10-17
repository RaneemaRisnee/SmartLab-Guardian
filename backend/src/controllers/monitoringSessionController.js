const { Lab, MonitoringSession } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/** GET /api/monitoring-sessions */
exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.lab) filter.lab = req.query.lab;
  const sessions = await MonitoringSession.find(filter)
    .populate('lab', 'code name')
    .populate('startedBy', 'name role')
    .sort({ startedAt: -1 })
    .limit(100);
  res.json({ success: true, data: sessions });
});

/** POST /api/monitoring-sessions - starts a lab-level monitoring window. */
exports.create = asyncHandler(async (req, res) => {
  const { lab } = req.body;
  if (!lab) throw ApiError.badRequest('Lab is required');
  const labRecord = await Lab.findById(lab);
  if (!labRecord) throw ApiError.badRequest('Lab not found');
  const existing = await MonitoringSession.findOne({ lab, status: 'active' });
  if (existing) throw ApiError.conflict('This lab already has an active monitoring session');
  const session = await MonitoringSession.create({ lab, startedBy: req.user._id });
  await session.populate([
    { path: 'lab', select: 'code name' },
    { path: 'startedBy', select: 'name role' }
  ]);
  res.status(201).json({ success: true, data: session });
});

/** PUT /api/monitoring-sessions/:id/end - finishes the monitoring window. */
exports.end = asyncHandler(async (req, res) => {
  const session = await MonitoringSession.findById(req.params.id);
  if (!session) throw ApiError.notFound('Monitoring session not found');
  if (session.status !== 'active') throw ApiError.conflict('This monitoring session has already finished');
  session.status = 'ended';
  session.endedAt = new Date();
  await session.save();
  await session.populate([
    { path: 'lab', select: 'code name' },
    { path: 'startedBy', select: 'name role' }
  ]);
  res.json({ success: true, data: session });
});
