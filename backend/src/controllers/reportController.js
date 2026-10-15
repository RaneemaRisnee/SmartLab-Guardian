const mongoose = require('mongoose');
const {
  ApplicationUsage,
  AttendanceRecord,
  HardwareDevice,
  HardwareRemovalAlert,
  LoginSession,
  UsageReport
} = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { buildDateRange, toMinutes } = require('../utils/dates');
const { buildWorkbook } = require('../services/excelService');

/** Shared scope filter for every report, cast for aggregation pipelines. */
function scopeMatch(query, dateField = 'loginTime') {
  const match = {};
  if (query.lab && mongoose.isValidObjectId(query.lab)) {
    match.lab = new mongoose.Types.ObjectId(String(query.lab));
  }
  const range = buildDateRange(query.from, query.to);
  if (range) match[dateField] = range;
  return match;
}

/**
 * GET /api/reports/usage
 * Per-session usage with the top applications, plus lab-level totals.
 */
exports.usage = asyncHandler(async (req, res) => {
  const match = scopeMatch(req.query);

  const sessions = await LoginSession.find(match)
    .populate('student', 'regNo name')
    .populate('computer', 'pcNumber')
    .populate('lab', 'code name')
    .sort({ loginTime: -1 })
    .limit(500)
    .lean();

  const sessionIds = sessions.map((s) => s._id);

  const topApps = await ApplicationUsage.aggregate([
    { $match: { session: { $in: sessionIds } } },
    {
      $group: {
        _id: '$appName',
        seconds: { $sum: '$durationSeconds' },
        sessions: { $addToSet: '$session' },
        blocked: { $max: { $cond: ['$blocked', 1, 0] } }
      }
    },
    {
      $project: {
        _id: 0,
        appName: '$_id',
        minutes: { $round: [{ $divide: ['$seconds', 60] }, 1] },
        sessions: { $size: '$sessions' },
        blocked: { $eq: ['$blocked', 1] }
      }
    },
    { $sort: { minutes: -1 } },
    { $limit: 15 }
  ]);

  const totals = sessions.reduce(
    (acc, s) => {
      acc.sessions += 1;
      acc.activeMinutes += toMinutes(s.activeSeconds);
      acc.idleMinutes += toMinutes(s.idleSeconds);
      if (s.flagged) acc.flagged += 1;
      return acc;
    },
    { sessions: 0, activeMinutes: 0, idleMinutes: 0, flagged: 0 }
  );

  totals.activeMinutes = Math.round(totals.activeMinutes * 10) / 10;
  totals.idleMinutes = Math.round(totals.idleMinutes * 10) / 10;
  totals.averageActiveMinutes = totals.sessions
    ? Math.round((totals.activeMinutes / totals.sessions) * 10) / 10
    : 0;

  const rows = sessions.map((s) => ({
    regNo: s.student ? s.student.regNo : '-',
    student: s.student ? s.student.name : '-',
    pc: s.computer ? s.computer.pcNumber : '-',
    lab: s.lab ? s.lab.code : '-',
    loginTime: s.loginTime,
    logoutTime: s.logoutTime || null,
    activeMinutes: toMinutes(s.activeSeconds),
    idleMinutes: toMinutes(s.idleSeconds),
    flagged: s.flagged,
    riskScore: s.riskScore,
    flagReasons: (s.flagReasons || []).join('; ')
  }));

  res.json({ success: true, data: { summary: totals, topApps, rows } });
});

/** GET /api/reports/attendance */
exports.attendance = asyncHandler(async (req, res) => {
  const match = scopeMatch(req.query, 'date');

  const records = await AttendanceRecord.find(match)
    .populate('student', 'regNo name batch')
    .populate('lab', 'code name')
    .sort({ date: -1 })
    .limit(1000)
    .lean();

  const summary = records.reduce(
    (acc, r) => {
      acc.total += 1;
      acc[r.status] = (acc[r.status] || 0) + 1;
      acc.activeMinutes += r.activeMinutes || 0;
      return acc;
    },
    { total: 0, present: 0, flagged: 0, absent: 0, activeMinutes: 0 }
  );

  summary.activeMinutes = Math.round(summary.activeMinutes * 10) / 10;
  summary.attendanceRate = summary.total
    ? Math.round((summary.present / summary.total) * 1000) / 10
    : 0;

  const rows = records.map((r) => ({
    date: r.date,
    regNo: r.student ? r.student.regNo : '-',
    student: r.student ? r.student.name : '-',
    lab: r.lab ? r.lab.code : '-',
    status: r.status,
    activeMinutes: r.activeMinutes,
    requiredMinutes: r.requiredMinutes,
    meetsMinActivity: r.meetsMinActivity,
    missingApps: (r.requiredAppsMissing || []).join('; '),
    remarks: r.remarks || ''
  }));

  res.json({ success: true, data: { summary, rows } });
});

/** GET /api/reports/hardware - inventory state plus the removal history. */
exports.hardware = asyncHandler(async (req, res) => {
  const deviceMatch = {};
  if (req.query.lab && mongoose.isValidObjectId(req.query.lab)) {
    deviceMatch.lab = new mongoose.Types.ObjectId(String(req.query.lab));
  }

  const alertMatch = { ...deviceMatch };
  const range = buildDateRange(req.query.from, req.query.to);
  if (range) alertMatch.removalTime = range;

  const [devices, alerts] = await Promise.all([
    HardwareDevice.find(deviceMatch)
      .populate('computer', 'pcNumber')
      .populate('lab', 'code')
      .sort({ hardwareId: 1 })
      .limit(1000)
      .lean(),
    HardwareRemovalAlert.find(alertMatch)
      .populate('computer', 'pcNumber')
      .populate('hardwareDevice', 'hardwareId deviceType model')
      .sort({ removalTime: -1 })
      .limit(500)
      .lean()
  ]);

  const summary = devices.reduce(
    (acc, d) => {
      acc.total += 1;
      acc.byStatus[d.status] = (acc.byStatus[d.status] || 0) + 1;
      acc.byCondition[d.condition] = (acc.byCondition[d.condition] || 0) + 1;
      return acc;
    },
    { total: 0, byStatus: {}, byCondition: {}, alerts: alerts.length }
  );

  summary.openAlerts = alerts.filter((a) => a.status === 'open').length;

  const rows = devices.map((d) => ({
    hardwareId: d.hardwareId,
    deviceType: d.deviceType,
    vendor: d.vendor || '',
    model: d.model || '',
    serialNumber: d.serialNumber || '',
    pc: d.computer ? d.computer.pcNumber : 'unassigned',
    lab: d.lab ? d.lab.code : '-',
    condition: d.condition,
    status: d.status,
    lastSeenAt: d.lastSeenAt || null
  }));

  const alertRows = alerts.map((a) => ({
    removalTime: a.removalTime,
    pc: a.computer ? a.computer.pcNumber : '-',
    deviceType: a.deviceType,
    device: a.deviceLabel || (a.hardwareDevice ? a.hardwareDevice.hardwareId : '-'),
    severity: a.severity,
    status: a.status,
    note: a.resolutionNote || ''
  }));

  res.json({ success: true, data: { summary, rows, alertRows } });
});

/** GET /api/reports - previously saved report snapshots. */
exports.listSaved = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.reportType) filter.reportType = req.query.reportType;

  const reports = await UsageReport.find(filter)
    .populate('generatedBy', 'name role')
    .populate('scope.lab', 'code name')
    .sort({ generatedAt: -1 })
    .limit(100);

  res.json({ success: true, data: reports });
});

/** GET /api/reports/saved/:id */
exports.getSaved = asyncHandler(async (req, res) => {
  const report = await UsageReport.findById(req.params.id)
    .populate('generatedBy', 'name role')
    .populate('scope.lab', 'code name');
  if (!report) throw ApiError.notFound('Report not found');
  res.json({ success: true, data: report });
});

/** POST /api/reports - save the report currently on screen. */
exports.save = asyncHandler(async (req, res) => {
  const { title, reportType, summary, rows, lab, from, to } = req.body;

  if (!title || !reportType) {
    throw ApiError.badRequest('A title and report type are required');
  }
  if (!Array.isArray(rows)) {
    throw ApiError.badRequest('Report rows must be an array');
  }

  const report = await UsageReport.create({
    title,
    reportType,
    summary: summary || {},
    rows,
    scope: {
      lab: lab && mongoose.isValidObjectId(lab) ? lab : undefined,
      dateFrom: from || undefined,
      dateTo: to || undefined
    },
    generatedBy: req.user._id,
    generatedAt: new Date()
  });

  res.status(201).json({ success: true, data: report });
});

/** DELETE /api/reports/:id */
exports.removeSaved = asyncHandler(async (req, res) => {
  const report = await UsageReport.findByIdAndDelete(req.params.id);
  if (!report) throw ApiError.notFound('Report not found');
  res.json({ success: true, message: 'Report deleted' });
});

/** POST /api/reports/export - download the rows on screen as an .xlsx file. */
exports.exportExcel = asyncHandler(async (req, res) => {
  const { rows, filename = 'smartlab-report', sheetName = 'Report' } = req.body;

  if (!Array.isArray(rows) || !rows.length) {
    throw ApiError.badRequest('There are no rows to export');
  }

  const buffer = await buildWorkbook(rows, sheetName);
  const safeName = String(filename).replace(/[^a-z0-9-_]/gi, '-');

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.xlsx"`);
  res.send(buffer);
});
