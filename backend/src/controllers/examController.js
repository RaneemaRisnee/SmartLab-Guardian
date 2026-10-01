const {
  Computer,
  ExamAssignment,
  ExamSession,
  Lab,
  LoginSession,
  Student
} = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { buildDateRange } = require('../utils/dates');
const { autoAssign } = require('../services/assignmentService');
const { parseSheet, mapStudentRows } = require('../services/excelService');
const sessionService = require('../services/sessionService');
const { emitEvent } = require('../realtime/io');

/** GET /api/exams */
exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.lab) filter.lab = req.query.lab;
  if (req.query.status) filter.status = req.query.status;

  const range = buildDateRange(req.query.from, req.query.to);
  if (range) filter.examDate = range;

  const exams = await ExamSession.find(filter)
    .populate('lab', 'code name location')
    .populate('createdBy', 'name role')
    .sort({ examDate: -1 });

  const counts = await ExamAssignment.aggregate([
    { $group: { _id: { exam: '$examSession', status: '$signInStatus' }, count: { $sum: 1 } } }
  ]);

  const byExam = new Map();
  for (const row of counts) {
    const key = row._id.exam.toString();
    const entry = byExam.get(key) || { total: 0, pending: 0, 'signed-in': 0, 'signed-out': 0, absent: 0 };
    entry[row._id.status] = row.count;
    entry.total += row.count;
    byExam.set(key, entry);
  }

  res.json({
    success: true,
    data: exams.map((exam) => ({
      ...exam.toJSON(),
      assignmentCounts: byExam.get(exam._id.toString()) || {
        total: 0,
        pending: 0,
        'signed-in': 0,
        'signed-out': 0,
        absent: 0
      }
    }))
  });
});

/** GET /api/exams/:id - exam with its full seating list. */
exports.getOne = asyncHandler(async (req, res) => {
  const exam = await ExamSession.findById(req.params.id)
    .populate('lab', 'code name location capacity')
    .populate('createdBy', 'name role');
  if (!exam) throw ApiError.notFound('Exam session not found');

  const assignments = await ExamAssignment.find({ examSession: exam._id })
    .populate('student', 'regNo name email username')
    .populate('computer', 'pcNumber status lastHeartbeatAt')
    .sort({ seatNumber: 1 });

  res.json({ success: true, data: { exam, assignments } });
});

/** POST /api/exams */
exports.create = asyncHandler(async (req, res) => {
  const { code, name, lab, examDate, startTime, endTime, autoSignIn, notes } = req.body;

  const labDoc = await Lab.findById(lab);
  if (!labDoc) throw ApiError.badRequest('Select a valid lab for this exam');

  const exam = await ExamSession.create({
    code,
    name,
    lab,
    examDate,
    startTime,
    endTime,
    autoSignIn: autoSignIn !== false,
    notes,
    status: 'draft',
    createdBy: req.user._id
  });

  res.status(201).json({ success: true, data: exam });
});

/** PUT /api/exams/:id */
exports.update = asyncHandler(async (req, res) => {
  const exam = await ExamSession.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate('lab', 'code name');
  if (!exam) throw ApiError.notFound('Exam session not found');
  res.json({ success: true, data: exam });
});

/** DELETE /api/exams/:id */
exports.remove = asyncHandler(async (req, res) => {
  const exam = await ExamSession.findById(req.params.id);
  if (!exam) throw ApiError.notFound('Exam session not found');

  if (exam.status === 'active') {
    throw ApiError.conflict('Cannot delete an exam that is currently running');
  }

  await ExamAssignment.deleteMany({ examSession: exam._id });
  await exam.deleteOne();

  res.json({ success: true, message: 'Exam session and its assignments deleted' });
});

/**
 * POST /api/exams/:id/candidates - upload the candidate list as Excel.
 *
 * Students already registered are matched by registration number; unknown
 * registration numbers are created, so the examiner can work straight from the
 * department's exam sheet without pre-registering anyone.
 */
exports.importCandidates = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Upload an .xlsx, .xls or .csv file in the "file" field');

  const exam = await ExamSession.findById(req.params.id);
  if (!exam) throw ApiError.notFound('Exam session not found');

  const rows = await parseSheet(req.file.buffer, req.file.originalname);
  const { valid, errors } = mapStudentRows(rows);

  const defaultPassword = process.env.DEFAULT_STUDENT_PASSWORD || 'Student@123';
  const studentIds = [];
  let createdStudents = 0;

  for (const row of valid) {
    let student = await Student.findOne({ regNo: row.regNo });
    if (!student) {
      student = new Student(row);
      student.password = defaultPassword;
      await student.save();
      createdStudents += 1;
    }
    studentIds.push(student._id);
  }

  if (!studentIds.length) {
    throw ApiError.badRequest('No usable candidate rows were found in the spreadsheet', errors);
  }

  const result = await autoAssign(exam, studentIds, {
    strategy: req.body.strategy || 'sequential'
  });

  if (exam.status === 'draft') {
    exam.status = 'scheduled';
    await exam.save();
  }

  res.json({
    success: true,
    data: {
      totalRows: rows.length,
      candidates: studentIds.length,
      createdStudents,
      skipped: errors.length,
      errors,
      ...result
    }
  });
});

/** POST /api/exams/:id/assign - (re)run seating for candidates already added. */
exports.assign = asyncHandler(async (req, res) => {
  const exam = await ExamSession.findById(req.params.id);
  if (!exam) throw ApiError.notFound('Exam session not found');

  let studentIds = req.body.studentIds;

  if (!Array.isArray(studentIds) || !studentIds.length) {
    // No explicit list: reseat whoever is already assigned to this exam.
    const existing = await ExamAssignment.find({ examSession: exam._id }).select('student');
    studentIds = existing.map((a) => a.student);
  }

  if (!studentIds.length) {
    throw ApiError.badRequest('Add candidates to this exam before assigning computers');
  }

  const result = await autoAssign(exam, studentIds, {
    strategy: req.body.strategy || 'sequential'
  });

  if (exam.status === 'draft') {
    exam.status = 'scheduled';
    await exam.save();
  }

  res.json({ success: true, data: result });
});

/**
 * POST /api/exams/:id/sign-in - the headline feature: sign every candidate in
 * to their assigned PC at once, instead of staff walking the room.
 *
 * Each seat is attempted independently so one unusable PC does not stop the
 * rest of the hall from starting.
 */
exports.signInAll = asyncHandler(async (req, res) => {
  const exam = await ExamSession.findById(req.params.id);
  if (!exam) throw ApiError.notFound('Exam session not found');

  const assignments = await ExamAssignment.find({
    examSession: exam._id,
    signInStatus: 'pending'
  })
    .populate('student')
    .populate('computer');

  if (!assignments.length) {
    throw ApiError.badRequest('There are no candidates left to sign in for this exam');
  }

  const signedIn = [];
  const failed = [];

  for (const assignment of assignments) {
    try {
      if (!assignment.student || !assignment.student.isActive) {
        throw new Error('Student account is missing or deactivated');
      }
      if (!assignment.computer) {
        throw new Error('Assigned computer no longer exists');
      }
      if (assignment.computer.status === 'maintenance') {
        throw new Error(`${assignment.computer.pcNumber} is under maintenance`);
      }

      const existing = await LoginSession.findOne({
        computer: assignment.computer._id,
        status: 'active'
      });
      if (existing) {
        throw new Error(`${assignment.computer.pcNumber} already has an open session`);
      }

      await sessionService.startSession({
        student: assignment.student,
        computer: assignment.computer,
        sessionType: 'exam',
        examSession: exam._id
      });

      signedIn.push({
        regNo: assignment.student.regNo,
        pcNumber: assignment.computer.pcNumber,
        seatNumber: assignment.seatNumber
      });
    } catch (err) {
      failed.push({
        seatNumber: assignment.seatNumber,
        regNo: assignment.student ? assignment.student.regNo : 'unknown',
        reason: err.message
      });
    }
  }

  exam.status = 'active';
  await exam.save();

  emitEvent('exam:signed-in', { examId: exam._id.toString(), signedIn: signedIn.length });

  res.json({
    success: true,
    data: { signedIn: signedIn.length, failedCount: failed.length, signedInDetail: signedIn, failed }
  });
});

/** POST /api/exams/:id/end - close the exam and every session it opened. */
exports.endExam = asyncHandler(async (req, res) => {
  const exam = await ExamSession.findById(req.params.id);
  if (!exam) throw ApiError.notFound('Exam session not found');

  const openSessions = await LoginSession.find({ examSession: exam._id, status: 'active' });

  let closed = 0;
  for (const session of openSessions) {
    try {
      await sessionService.endSession(session._id);
      closed += 1;
    } catch (err) {
      // A session already closed by the agent is not an error worth failing on.
    }
  }

  await ExamAssignment.updateMany(
    { examSession: exam._id, signInStatus: 'pending' },
    { $set: { signInStatus: 'absent' } }
  );

  exam.status = 'completed';
  await exam.save();

  res.json({ success: true, data: { closedSessions: closed, exam } });
});

/** PUT /api/exams/:id/assignments/:assignmentId - move one candidate to another PC. */
exports.reassign = asyncHandler(async (req, res) => {
  const assignment = await ExamAssignment.findOne({
    _id: req.params.assignmentId,
    examSession: req.params.id
  });
  if (!assignment) throw ApiError.notFound('Assignment not found');

  if (assignment.signInStatus === 'signed-in') {
    throw ApiError.conflict('Sign this candidate out before moving them to another computer');
  }

  const computer = await Computer.findById(req.body.computerId);
  if (!computer) throw ApiError.badRequest('Computer not found');

  const taken = await ExamAssignment.findOne({
    examSession: assignment.examSession,
    computer: computer._id,
    _id: { $ne: assignment._id }
  });
  if (taken) throw ApiError.conflict(`${computer.pcNumber} is already assigned in this exam`);

  assignment.computer = computer._id;
  assignment.assignedAt = new Date();
  await assignment.save();

  res.json({ success: true, data: assignment });
});
