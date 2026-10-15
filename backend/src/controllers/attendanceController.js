const mongoose = require('mongoose');
const { AttendanceRecord } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { buildDateRange } = require('../utils/dates');

/**
 * Builds the shared attendance filter. `forAggregate` casts the id strings
 * itself, because an aggregation pipeline gets no schema to cast them for it.
 */
function buildFilter(query, { forAggregate = false } = {}) {
  const id = (value) => (forAggregate ? new mongoose.Types.ObjectId(String(value)) : value);
  const filter = {};

  if (query.lab && mongoose.isValidObjectId(query.lab)) filter.lab = id(query.lab);
  if (query.student && mongoose.isValidObjectId(query.student)) filter.student = id(query.student);
  if (query.status) filter.status = query.status;

  const range = buildDateRange(query.from, query.to);
  if (range) filter.date = range;

  return filter;
}

/** GET /api/attendance */
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = buildFilter(req.query);

  const [items, total] = await Promise.all([
    AttendanceRecord.find(filter)
      .populate('student', 'regNo name email batch')
      .populate('lab', 'code name')
      .populate('overriddenBy', 'name role')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit),
    AttendanceRecord.countDocuments(filter)
  ]);

  res.json({ success: true, data: paginatedResponse(items, total, { page, limit }) });
});

/** GET /api/attendance/summary - counts by status plus the per-student roll-up. */
exports.summary = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query, { forAggregate: true });

  const [byStatus, perStudent] = await Promise.all([
    AttendanceRecord.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    AttendanceRecord.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$student',
          sessions: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          flagged: { $sum: { $cond: [{ $eq: ['$status', 'flagged'] }, 1, 0] } },
          totalActiveMinutes: { $sum: '$activeMinutes' }
        }
      },
      { $sort: { flagged: -1, sessions: -1 } },
      { $limit: 100 },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $project: {
          _id: 0,
          studentId: '$_id',
          regNo: '$student.regNo',
          name: '$student.name',
          sessions: 1,
          present: 1,
          flagged: 1,
          totalActiveMinutes: { $round: ['$totalActiveMinutes', 1] }
        }
      }
    ])
  ]);

  res.json({
    success: true,
    data: {
      byStatus: byStatus.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
      perStudent
    }
  });
});

/**
 * PUT /api/attendance/:id - a lecturer overrides the automatic decision, for
 * example marking a student present after a genuine software failure.
 */
exports.override = asyncHandler(async (req, res) => {
  const { status, remarks } = req.body;

  if (!['present', 'flagged', 'absent'].includes(status)) {
    throw ApiError.badRequest('Status must be present, flagged or absent');
  }

  const record = await AttendanceRecord.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        status,
        remarks,
        overriddenBy: req.user._id,
        overriddenAt: new Date()
      }
    },
    { new: true }
  )
    .populate('student', 'regNo name')
    .populate('lab', 'code name');

  if (!record) throw ApiError.notFound('Attendance record not found');

  res.json({ success: true, data: record });
});
