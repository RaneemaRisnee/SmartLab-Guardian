const { AttendanceRecord, LoginSession, Student } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { parseSheet, mapStudentRows } = require('../services/excelService');

/** GET /api/students - searchable, paginated student list. */
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { regNo: rx }, { email: rx }];
  }
  if (req.query.batch) filter.batch = req.query.batch;
  if (req.query.active !== undefined) filter.isActive = req.query.active === 'true';

  const [items, total] = await Promise.all([
    Student.find(filter).sort({ regNo: 1 }).skip(skip).limit(limit),
    Student.countDocuments(filter)
  ]);

  res.json({ success: true, data: paginatedResponse(items, total, { page, limit }) });
});

/** GET /api/students/:id - profile plus recent sessions and attendance. */
exports.getOne = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw ApiError.notFound('Student not found');

  const [sessions, attendance] = await Promise.all([
    LoginSession.find({ student: student._id })
      .sort({ loginTime: -1 })
      .limit(10)
      .populate('computer', 'pcNumber')
      .populate('lab', 'code name'),
    AttendanceRecord.find({ student: student._id })
      .sort({ date: -1 })
      .limit(10)
      .populate('lab', 'code name')
  ]);

  res.json({ success: true, data: { student, sessions, attendance } });
});

/** POST /api/students - register one student. */
exports.create = asyncHandler(async (req, res) => {
  const { regNo, name, email, department, batch, password } = req.body;

  const student = new Student({ regNo, name, email, department, batch });
  student.password = password || process.env.DEFAULT_STUDENT_PASSWORD || 'Student@123';
  await student.save();

  res.status(201).json({ success: true, data: student.toJSON() });
});

/** PUT /api/students/:id */
exports.update = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw ApiError.notFound('Student not found');

  const { name, email, department, batch, isActive, password } = req.body;
  if (name !== undefined) student.name = name;
  if (email !== undefined) student.email = email;
  if (department !== undefined) student.department = department;
  if (batch !== undefined) student.batch = batch;
  if (isActive !== undefined) student.isActive = isActive;
  if (password) student.password = password;

  await student.save();
  res.json({ success: true, data: student.toJSON() });
});

/**
 * DELETE /api/students/:id
 * Students with recorded sessions are deactivated instead of deleted, so the
 * attendance and usage history they appear in stays readable.
 */
exports.remove = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw ApiError.notFound('Student not found');

  const sessionCount = await LoginSession.countDocuments({ student: student._id });

  if (sessionCount > 0) {
    student.isActive = false;
    await student.save();
    return res.json({
      success: true,
      message: `Student has ${sessionCount} recorded sessions and was deactivated instead of deleted`,
      data: student.toJSON()
    });
  }

  await student.deleteOne();
  res.json({ success: true, message: 'Student deleted' });
});

/**
 * POST /api/students/import - bulk register from the Excel sheet the
 * department already maintains. Existing registration numbers are updated
 * rather than rejected, so the sheet can be re-uploaded safely.
 */
exports.importFromExcel = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Upload an .xlsx, .xls or .csv file in the "file" field');

  const rows = await parseSheet(req.file.buffer, req.file.originalname);
  const { valid, errors } = mapStudentRows(rows);

  const defaultPassword = process.env.DEFAULT_STUDENT_PASSWORD || 'Student@123';
  let created = 0;
  let updated = 0;

  for (const row of valid) {
    const existing = await Student.findOne({ regNo: row.regNo });
    if (existing) {
      existing.name = row.name;
      existing.email = row.email;
      if (row.department) existing.department = row.department;
      if (row.batch) existing.batch = row.batch;
      await existing.save();
      updated += 1;
    } else {
      const student = new Student(row);
      student.password = defaultPassword;
      await student.save();
      created += 1;
    }
  }

  res.json({
    success: true,
    data: { totalRows: rows.length, created, updated, skipped: errors.length, errors }
  });
});
