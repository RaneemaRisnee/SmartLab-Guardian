const {
  ApplicationUsage,
  Computer,
  LoginSession,
  Student,
  WebsiteActivity
} = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { buildDateRange } = require('../utils/dates');
const sessionService = require('../services/sessionService');

function buildSessionFilter(query) {
  const filter = {};
  if (query.lab) filter.lab = query.lab;
  if (query.student) filter.student = query.student;
  if (query.computer) filter.computer = query.computer;
  if (query.status) filter.status = query.status;
  if (query.sessionType) filter.sessionType = query.sessionType;
  if (query.flagged !== undefined) filter.flagged = query.flagged === 'true';

  const range = buildDateRange(query.from, query.to);
  if (range) filter.loginTime = range;

  return filter;
}

/** GET /api/sessions - the lecturer's live and historical session list. */
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = buildSessionFilter(req.query);

  const [items, total] = await Promise.all([
    LoginSession.find(filter)
      .populate('student', 'regNo name email')
      .populate('computer', 'pcNumber')
      .populate('lab', 'code name')
      .sort({ loginTime: -1 })
      .skip(skip)
      .limit(limit),
    LoginSession.countDocuments(filter)
  ]);

  res.json({ success: true, data: paginatedResponse(items, total, { page, limit }) });
});

/** GET /api/sessions/:id - one session with its full application and web trail. */
exports.getOne = asyncHandler(async (req, res) => {
  const session = await LoginSession.findById(req.params.id)
    .populate('student', 'regNo name email department batch')
    .populate('computer', 'pcNumber hostname ipAddress')
    .populate('lab', 'code name')
    .populate('reviewedBy', 'name role');

  if (!session) throw ApiError.notFound('Session not found');

  const [applications, websites] = await Promise.all([
    ApplicationUsage.find({ session: session._id }).sort({ startTime: 1 }),
    WebsiteActivity.find({ session: session._id }).sort({ visitTime: 1 })
  ]);

  // Roll the raw application rows up per app for the session detail table.
  const perApp = new Map();
  for (const row of applications) {
    const entry = perApp.get(row.appName) || { appName: row.appName, seconds: 0, blocked: false };
    entry.seconds += row.durationSeconds;
    entry.blocked = entry.blocked || row.blocked;
    perApp.set(row.appName, entry);
  }

  res.json({
    success: true,
    data: {
      session,
      applications,
      websites,
      applicationTotals: [...perApp.values()].sort((a, b) => b.seconds - a.seconds)
    }
  });
});

/** GET /api/sessions/live - everything currently open, for the monitoring wall. */
exports.live = asyncHandler(async (req, res) => {
  const filter = { status: 'active' };
  if (req.query.lab) filter.lab = req.query.lab;

  const sessions = await LoginSession.find(filter)
    .populate('student', 'regNo name')
    .populate('computer', 'pcNumber status lastHeartbeatAt')
    .populate('lab', 'code name')
    .sort({ loginTime: -1 });

  res.json({ success: true, data: sessions });
});

/**
 * POST /api/sessions - staff open a session manually (e.g. an examiner seating
 * a student whose agent is not responding).
 */
exports.create = asyncHandler(async (req, res) => {
  const { studentId, computerId, sessionType, examSessionId } = req.body;

  const [student, computer] = await Promise.all([
    Student.findById(studentId),
    Computer.findById(computerId)
  ]);

  if (!student) throw ApiError.badRequest('Student not found');
  if (!computer) throw ApiError.badRequest('Computer not found');
  if (!student.isActive) throw ApiError.badRequest('This student account is deactivated');

  const session = await sessionService.startSession({
    student,
    computer,
    sessionType: sessionType || 'lab',
    examSession: examSessionId || null
  });

  res.status(201).json({ success: true, data: session });
});

/** PUT /api/sessions/:id/end - staff close a session from the dashboard. */
exports.end = asyncHandler(async (req, res) => {
  const session = await sessionService.endSession(req.params.id, {
    status: req.body.terminate ? 'terminated' : 'ended'
  });
  res.json({ success: true, data: session });
});

/** PUT /api/sessions/:id/review - record that staff looked at a flagged session. */
exports.review = asyncHandler(async (req, res) => {
  const { note, clearFlag } = req.body;

  const session = await LoginSession.findById(req.params.id);
  if (!session) throw ApiError.notFound('Session not found');

  session.reviewedBy = req.user._id;
  session.reviewedAt = new Date();
  session.reviewNote = note;

  if (clearFlag) {
    session.flagged = false;
    session.riskScore = 0;
  }

  await session.save();
  res.json({ success: true, data: session });
});
