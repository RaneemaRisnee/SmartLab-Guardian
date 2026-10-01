const {
  AttendanceRecord,
  Computer,
  ExamSession,
  HardwareDevice,
  HardwareRemovalAlert,
  Lab,
  LoginSession,
  Student
} = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { startOfDay, endOfDay, toMinutes } = require('../utils/dates');

/**
 * GET /api/dashboard/overview
 * One call that fills the whole landing screen, so the dashboard does not fan
 * out into a dozen requests on every refresh.
 */
exports.overview = asyncHandler(async (req, res) => {
  const today = { $gte: startOfDay(), $lte: endOfDay() };

  const [
    labs,
    computerStatus,
    activeSessions,
    todaySessions,
    flaggedToday,
    openAlerts,
    criticalAlerts,
    students,
    hardwareTotal,
    missingHardware,
    upcomingExams
  ] = await Promise.all([
    Lab.countDocuments({ isActive: true }),
    Computer.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    LoginSession.countDocuments({ status: 'active' }),
    LoginSession.countDocuments({ loginTime: today }),
    LoginSession.countDocuments({ loginTime: today, flagged: true }),
    HardwareRemovalAlert.countDocuments({ status: 'open' }),
    HardwareRemovalAlert.countDocuments({ status: 'open', severity: 'high' }),
    Student.countDocuments({ isActive: true }),
    HardwareDevice.countDocuments({ status: { $ne: 'retired' } }),
    HardwareDevice.countDocuments({ status: 'missing' }),
    ExamSession.countDocuments({ status: { $in: ['scheduled', 'active'] } })
  ]);

  const statusMap = computerStatus.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {});
  const totalComputers = Object.values(statusMap).reduce((a, b) => a + b, 0);

  const [recentFlagged, recentAlerts, liveSessions, attendanceToday] = await Promise.all([
    LoginSession.find({ flagged: true, loginTime: today })
      .populate('student', 'regNo name')
      .populate('computer', 'pcNumber')
      .populate('lab', 'code')
      .sort({ riskScore: -1, loginTime: -1 })
      .limit(8),
    HardwareRemovalAlert.find({ status: 'open' })
      .populate('computer', 'pcNumber')
      .populate('hardwareDevice', 'hardwareId deviceType model')
      .sort({ removalTime: -1 })
      .limit(8),
    LoginSession.find({ status: 'active' })
      .populate('student', 'regNo name')
      .populate('computer', 'pcNumber')
      .populate('lab', 'code name')
      .sort({ loginTime: -1 })
      .limit(10),
    AttendanceRecord.aggregate([
      { $match: { date: today } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);

  // Usage over the last 7 days, for the trend strip.
  const weekStart = startOfDay(new Date(Date.now() - 6 * 86400000));
  const weekly = await LoginSession.aggregate([
    { $match: { loginTime: { $gte: weekStart } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$loginTime' } },
        sessions: { $sum: 1 },
        flagged: { $sum: { $cond: ['$flagged', 1, 0] } },
        activeSeconds: { $sum: '$activeSeconds' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        labs,
        totalComputers,
        computersInUse: statusMap['in-use'] || 0,
        computersAvailable: statusMap.available || 0,
        computersOffline: statusMap.offline || 0,
        computersMaintenance: statusMap.maintenance || 0,
        activeSessions,
        todaySessions,
        flaggedToday,
        openAlerts,
        criticalAlerts,
        students,
        hardwareTotal,
        missingHardware,
        upcomingExams
      },
      attendanceToday: attendanceToday.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
      weekly: weekly.map((d) => ({
        date: d._id,
        sessions: d.sessions,
        flagged: d.flagged,
        activeMinutes: toMinutes(d.activeSeconds)
      })),
      recentFlagged,
      recentAlerts,
      liveSessions
    }
  });
});
