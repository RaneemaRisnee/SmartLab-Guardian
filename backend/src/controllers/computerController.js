const { Computer, HardwareDevice, Lab, LoginSession } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { parseSheet, mapComputerRows } = require('../services/excelService');

/** GET /api/computers - filterable list with the student currently signed in. */
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 50 });
  const filter = {};

  if (req.query.lab) filter.lab = req.query.lab;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ pcNumber: rx }, { hostname: rx }, { ipAddress: rx }];
  }

  const [items, total] = await Promise.all([
    Computer.find(filter).populate('lab', 'code name').sort({ pcNumber: 1 }).skip(skip).limit(limit),
    Computer.countDocuments(filter)
  ]);

  const activeSessions = await LoginSession.find({
    computer: { $in: items.map((c) => c._id) },
    status: 'active'
  }).populate('student', 'regNo name');

  const occupant = new Map(
    activeSessions.map((s) => [s.computer.toString(), s.student])
  );

  res.json({
    success: true,
    data: paginatedResponse(
      items.map((c) => ({ ...c.toJSON(), currentStudent: occupant.get(c._id.toString()) || null })),
      total,
      { page, limit }
    )
  });
});

/** GET /api/computers/:id - one PC with its attached hardware. */
exports.getOne = asyncHandler(async (req, res) => {
  const computer = await Computer.findById(req.params.id).populate('lab', 'code name location');
  if (!computer) throw ApiError.notFound('Computer not found');

  const [hardware, recentSessions] = await Promise.all([
    HardwareDevice.find({ computer: computer._id }).sort({ deviceType: 1 }),
    LoginSession.find({ computer: computer._id })
      .sort({ loginTime: -1 })
      .limit(10)
      .populate('student', 'regNo name')
  ]);

  res.json({ success: true, data: { computer, hardware, recentSessions } });
});

/** POST /api/computers */
exports.create = asyncHandler(async (req, res) => {
  const lab = await Lab.findById(req.body.lab);
  if (!lab) throw ApiError.badRequest('Select a valid lab for this computer');

  const computer = await Computer.create(req.body);
  res.status(201).json({ success: true, data: computer });
});

/** PUT /api/computers/:id */
exports.update = asyncHandler(async (req, res) => {
  const computer = await Computer.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate('lab', 'code name');
  if (!computer) throw ApiError.notFound('Computer not found');
  res.json({ success: true, data: computer });
});

/** DELETE /api/computers/:id - refused while a student is still signed in. */
exports.remove = asyncHandler(async (req, res) => {
  const computer = await Computer.findById(req.params.id);
  if (!computer) throw ApiError.notFound('Computer not found');

  const active = await LoginSession.countDocuments({ computer: computer._id, status: 'active' });
  if (active > 0) {
    throw ApiError.conflict('A student is currently signed in on this computer');
  }

  await HardwareDevice.updateMany(
    { computer: computer._id },
    { $set: { computer: null, status: 'in-store' } }
  );
  await computer.deleteOne();

  res.json({ success: true, message: 'Computer deleted and its hardware returned to store' });
});

/** POST /api/computers/import?lab=<id> - bulk register a lab from a spreadsheet. */
exports.importFromExcel = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Upload an .xlsx, .xls or .csv file in the "file" field');

  const labId = req.body.lab || req.query.lab;
  const lab = await Lab.findById(labId);
  if (!lab) throw ApiError.badRequest('Provide the lab these computers belong to');

  const rows = await parseSheet(req.file.buffer, req.file.originalname);
  const { valid, errors } = mapComputerRows(rows);

  let created = 0;
  let updated = 0;

  for (const row of valid) {
    const existing = await Computer.findOne({ pcNumber: row.pcNumber });
    if (existing) {
      Object.assign(existing, row, { lab: lab._id });
      await existing.save();
      updated += 1;
    } else {
      await Computer.create({ ...row, lab: lab._id });
      created += 1;
    }
  }

  res.json({
    success: true,
    data: { totalRows: rows.length, created, updated, skipped: errors.length, errors }
  });
});
