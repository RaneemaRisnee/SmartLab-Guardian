const {
  Computer,
  ExamAssignment,
  ExamSession,
  LoginSession,
  MonitoringPolicy,
  Student
} = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const sessionService = require('../services/sessionService');
const { processHardwareScan } = require('../services/hardwareService');
const { emitEvent } = require('../realtime/io');

/** Resolves the PC an agent claims to be, by its PC number. */
async function requireComputer(pcNumber) {
  if (!pcNumber) throw ApiError.badRequest('pcNumber is required');

  const computer = await Computer.findOne({ pcNumber: String(pcNumber).toUpperCase() });
  if (!computer) {
    throw ApiError.notFound(`No computer is registered with PC number ${pcNumber}`);
  }
  return computer;
}

/**
 * POST /api/agent/heartbeat
 * Called on the agent's polling interval. Confirms the PC is alive, refreshes
 * its details, and returns the policy plus any pending exam sign-in so the
 * agent needs only one endpoint for its regular loop.
 */
exports.heartbeat = asyncHandler(async (req, res) => {
  const { pcNumber, hostname, ipAddress, macAddress, agentVersion, specs } = req.body;

  const computer = await requireComputer(pcNumber);

  if (hostname) computer.hostname = hostname;
  if (ipAddress) computer.ipAddress = ipAddress;
  if (macAddress) computer.macAddress = macAddress;
  if (agentVersion) computer.agentVersion = agentVersion;
  if (specs) computer.specs = { ...computer.specs, ...specs };

  computer.lastHeartbeatAt = new Date();

  const activeSession = await LoginSession.findOne({
    computer: computer._id,
    status: 'active'
  }).populate('student', 'regNo name username');

  // An agent reporting in is never offline; the session decides the rest.
  if (computer.status === 'offline' || computer.status === 'available' || computer.status === 'in-use') {
    computer.status = activeSession ? 'in-use' : 'available';
  }
  await computer.save();

  const policy = await MonitoringPolicy.resolveFor(computer.lab);

  // A pending assignment for an exam that has started is the agent's cue to
  // sign the candidate in automatically.
  let pendingSignIn = null;
  if (!activeSession) {
    const assignment = await ExamAssignment.findOne({
      computer: computer._id,
      signInStatus: 'pending'
    })
      .populate('student', 'regNo name username')
      .populate('examSession', 'name code status autoSignIn');

    if (
      assignment &&
      assignment.examSession &&
      assignment.examSession.autoSignIn &&
      assignment.examSession.status === 'active'
    ) {
      pendingSignIn = {
        assignmentId: assignment._id,
        examSessionId: assignment.examSession._id,
        examName: assignment.examSession.name,
        seatNumber: assignment.seatNumber,
        student: assignment.student
      };
    }
  }

  res.json({
    success: true,
    data: {
      computer: {
        id: computer._id,
        pcNumber: computer.pcNumber,
        status: computer.status,
        lab: computer.lab
      },
      activeSession: activeSession
        ? {
            id: activeSession._id,
            student: activeSession.student,
            loginTime: activeSession.loginTime,
            sessionType: activeSession.sessionType
          }
        : null,
      pendingSignIn,
      policy: {
        minActiveMinutes: policy.minActiveMinutes,
        idleThresholdSeconds: policy.idleThresholdSeconds,
        requiredApps: policy.requiredApps,
        blockedApps: policy.blockedApps,
        blockedDomains: policy.blockedDomains,
        hardwareScanIntervalMinutes: policy.hardwareScanIntervalMinutes
      }
    }
  });
});

/**
 * POST /api/agent/login
 * A student signs in at the PC. The agent passes the credentials it collected;
 * the server verifies them and opens the session.
 */
exports.studentLogin = asyncHandler(async (req, res) => {
  const { pcNumber, username, password } = req.body;

  const computer = await requireComputer(pcNumber);

  if (!username || !password) {
    throw ApiError.badRequest('username and password are required');
  }

  const lookup = String(username).trim().toLowerCase();
  const student = await Student.findOne({
    $or: [{ username: lookup }, { regNo: String(username).trim().toUpperCase() }]
  }).select('+passwordHash');

  if (!student || !(await student.verifyPassword(password))) {
    throw ApiError.unauthorized('Username or password is incorrect');
  }
  if (!student.isActive) {
    throw ApiError.forbidden('This student account has been deactivated');
  }

  const existing = await LoginSession.findOne({ computer: computer._id, status: 'active' });
  if (existing) {
    throw ApiError.conflict('Another session is already open on this computer');
  }

  // Only an exam that has actually started takes precedence over an ordinary
  // lab sitting - a 'scheduled' exam days away must not turn every routine
  // lab login beforehand into a false "wrong PC for the exam" flag.
  const assignment = await ExamAssignment.findOne({
    student: student._id,
    signInStatus: 'pending'
  }).populate('examSession', 'status');

  const isExam = assignment && assignment.examSession && assignment.examSession.status === 'active';

  const session = await sessionService.startSession({
    student,
    computer,
    sessionType: isExam ? 'exam' : 'lab',
    examSession: isExam ? assignment.examSession._id : null
  });

  res.status(201).json({
    success: true,
    data: {
      sessionId: session._id,
      student: { regNo: student.regNo, name: student.name },
      sessionType: session.sessionType,
      flagged: session.flagged,
      flagReasons: session.flagReasons
    }
  });
});

/** POST /api/agent/logout - the student signs out or the PC shuts down. */
exports.studentLogout = asyncHandler(async (req, res) => {
  const { sessionId, pcNumber } = req.body;

  let targetId = sessionId;

  if (!targetId) {
    const computer = await requireComputer(pcNumber);
    const active = await LoginSession.findOne({ computer: computer._id, status: 'active' });
    if (!active) throw ApiError.notFound('No open session on this computer');
    targetId = active._id;
  }

  const session = await sessionService.endSession(targetId);

  res.json({
    success: true,
    data: {
      sessionId: session._id,
      activeSeconds: session.activeSeconds,
      flagged: session.flagged,
      flagReasons: session.flagReasons
    }
  });
});

/**
 * POST /api/agent/activity
 * Batched application, website and active/idle time since the last report.
 * Batching is what lets the agent survive a network drop and resend later.
 */
exports.activity = asyncHandler(async (req, res) => {
  const { sessionId, applications, websites, activeSeconds, idleSeconds } = req.body;

  if (!sessionId) throw ApiError.badRequest('sessionId is required');

  const result = await sessionService.recordActivity(sessionId, {
    applications: Array.isArray(applications) ? applications : [],
    websites: Array.isArray(websites) ? websites : [],
    activeSeconds,
    idleSeconds
  });

  if (result && result.flagged) {
    emitEvent('session:flagged', { sessionId, riskScore: result.riskScore });
  }

  res.json({ success: true, data: result });
});

/**
 * POST /api/agent/hardware-scan
 * The 5-minute inventory check. The agent sends everything it can currently
 * see; the server diffs it against the register and raises removal alerts.
 */
exports.hardwareScan = asyncHandler(async (req, res) => {
  const { pcNumber, devices } = req.body;

  const computer = await requireComputer(pcNumber);

  if (!Array.isArray(devices)) {
    throw ApiError.badRequest('devices must be an array of connected hardware');
  }

  computer.lastHeartbeatAt = new Date();
  await computer.save();

  const result = await processHardwareScan(computer, devices, new Date());

  res.json({
    success: true,
    data: {
      pcNumber: computer.pcNumber,
      scanned: devices.length,
      reconnected: result.reconnected,
      removed: result.removed,
      unknown: result.unknown,
      alertsRaised: result.alerts.length
    }
  });
});

/**
 * POST /api/agent/exam-sign-in
 * The agent confirms it has signed a candidate in to the assigned PC, after
 * picking the instruction up from a heartbeat.
 */
exports.examSignIn = asyncHandler(async (req, res) => {
  const { pcNumber, assignmentId } = req.body;

  const computer = await requireComputer(pcNumber);

  const assignment = await ExamAssignment.findById(assignmentId).populate('student');
  if (!assignment) throw ApiError.notFound('Assignment not found');

  if (assignment.computer.toString() !== computer._id.toString()) {
    throw ApiError.badRequest('This assignment belongs to a different computer');
  }
  if (assignment.signInStatus === 'signed-in') {
    throw ApiError.conflict('This candidate is already signed in');
  }

  const exam = await ExamSession.findById(assignment.examSession);
  if (!exam || exam.status !== 'active') {
    throw ApiError.conflict('The exam is not currently running');
  }

  const existing = await LoginSession.findOne({ computer: computer._id, status: 'active' });
  if (existing) throw ApiError.conflict('Another session is already open on this computer');

  const session = await sessionService.startSession({
    student: assignment.student,
    computer,
    sessionType: 'exam',
    examSession: exam._id
  });

  res.status(201).json({
    success: true,
    data: { sessionId: session._id, student: assignment.student.regNo, seat: assignment.seatNumber }
  });
});
