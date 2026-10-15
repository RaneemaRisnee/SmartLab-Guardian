const {
  ApplicationUsage,
  AttendanceRecord,
  Computer,
  ExamAssignment,
  LoginSession,
  MonitoringPolicy,
  WebsiteActivity
} = require('../models');
const ApiError = require('../utils/ApiError');
const { emitEvent } = require('../realtime/io');
const { evaluateSession } = require('./flaggingService');

/**
 * Opens a session for a student on a PC.
 *
 * Any session the student already has open elsewhere stays open on purpose -
 * that overlap is exactly what the concurrent-session rule needs to see, so
 * the misuse is recorded rather than hidden by closing the old one.
 */
async function startSession({ student, computer, sessionType = 'lab', examSession = null }) {
  const session = await LoginSession.create({
    student: student._id,
    computer: computer._id,
    lab: computer.lab,
    sessionType,
    examSession,
    loginTime: new Date(),
    lastActivityAt: new Date()
  });

  computer.status = 'in-use';
  await computer.save();

  // Attendance is recorded at login, then refined as activity arrives.
  const policy = await MonitoringPolicy.resolveFor(computer.lab);
  await AttendanceRecord.findOneAndUpdate(
    { session: session._id },
    {
      $set: {
        student: student._id,
        lab: computer.lab,
        date: session.loginTime,
        status: 'present',
        meetsMinActivity: false,
        activeMinutes: 0,
        requiredMinutes: policy.minActiveMinutes
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const assignment =
    sessionType === 'exam' && examSession
      ? await ExamAssignment.findOne({ examSession, student: student._id })
      : null;

  await evaluateSession(session._id, {
    assignedComputerId: assignment ? assignment.computer : null
  });

  if (assignment) {
    assignment.signInStatus = 'signed-in';
    assignment.signedInAt = session.loginTime;
    assignment.loginSession = session._id;
    await assignment.save();
  }

  emitEvent('session:started', {
    sessionId: session._id.toString(),
    pcNumber: computer.pcNumber,
    studentName: student.name
  });

  return LoginSession.findById(session._id)
    .populate('student', 'regNo name email')
    .populate('computer', 'pcNumber hostname')
    .populate('lab', 'code name');
}

/** Closes a session, frees the PC and runs a final misuse evaluation. */
async function endSession(sessionId, { status = 'ended' } = {}) {
  const session = await LoginSession.findById(sessionId);
  if (!session) throw ApiError.notFound('Session not found');
  if (session.status !== 'active') {
    throw ApiError.conflict('This session has already been closed');
  }

  session.logoutTime = new Date();
  session.status = status;
  await session.save();

  const computer = await Computer.findById(session.computer);
  if (computer && computer.status === 'in-use') {
    computer.status = 'available';
    await computer.save();
  }

  await ExamAssignment.findOneAndUpdate(
    { loginSession: session._id },
    { $set: { signInStatus: 'signed-out', signedOutAt: session.logoutTime } }
  );

  const result = await evaluateSession(session._id);

  emitEvent('session:ended', {
    sessionId: session._id.toString(),
    flagged: result ? result.flagged : false
  });

  return LoginSession.findById(session._id)
    .populate('student', 'regNo name email')
    .populate('computer', 'pcNumber hostname')
    .populate('lab', 'code name');
}

/**
 * Stores a batch of activity reported by the agent and re-evaluates the
 * session. Durations are added to the session's active/idle counters rather
 * than replacing them, so a dropped batch never rewinds the totals.
 */
async function recordActivity(sessionId, { applications = [], websites = [], activeSeconds = 0, idleSeconds = 0 }) {
  const session = await LoginSession.findById(sessionId);
  if (!session) throw ApiError.notFound('Session not found');
  if (session.status !== 'active') {
    throw ApiError.conflict('Cannot record activity on a closed session');
  }

  const policy = await MonitoringPolicy.resolveFor(session.lab);
  const blockedApps = policy.blockedApps || [];
  const blockedDomains = policy.blockedDomains || [];

  if (applications.length) {
    await ApplicationUsage.insertMany(
      applications.map((app) => ({
        session: session._id,
        appName: app.appName,
        windowTitle: app.windowTitle,
        category: app.category || 'other',
        startTime: app.startTime ? new Date(app.startTime) : new Date(),
        endTime: app.endTime ? new Date(app.endTime) : undefined,
        durationSeconds: Number(app.durationSeconds) || 0,
        blocked: blockedApps.some((b) => (app.appName || '').toLowerCase().includes(b.toLowerCase()))
      }))
    );
  }

  if (websites.length) {
    // Saved one at a time so the pre-validate hook can derive each domain.
    await Promise.all(
      websites.map((site) =>
        WebsiteActivity.create({
          session: session._id,
          url: site.url,
          title: site.title,
          visitTime: site.visitTime ? new Date(site.visitTime) : new Date(),
          durationSeconds: Number(site.durationSeconds) || 0,
          blocked: blockedDomains.some((b) => (site.url || '').toLowerCase().includes(b.toLowerCase()))
        })
      )
    );
  }

  session.activeSeconds += Math.max(Number(activeSeconds) || 0, 0);
  session.idleSeconds += Math.max(Number(idleSeconds) || 0, 0);
  session.lastActivityAt = new Date();
  await session.save();

  const assignment = session.examSession
    ? await ExamAssignment.findOne({ examSession: session.examSession, student: session.student })
    : null;

  return evaluateSession(session._id, {
    assignedComputerId: assignment ? assignment.computer : null
  });
}

module.exports = { startSession, endSession, recordActivity };
