const { Computer, Lab, LoginSession } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/** GET /api/labs - every lab with live PC counts for the dashboard. */
exports.list = asyncHandler(async (req, res) => {
  const labs = await Lab.find().sort({ code: 1 }).lean();

  const counts = await Computer.aggregate([
    { $group: { _id: { lab: '$lab', status: '$status' }, count: { $sum: 1 } } }
  ]);

  const byLab = new Map();
  for (const row of counts) {
    const key = row._id.lab.toString();
    const entry = byLab.get(key) || { total: 0, available: 0, 'in-use': 0, offline: 0, maintenance: 0 };
    entry[row._id.status] = row.count;
    entry.total += row.count;
    byLab.set(key, entry);
  }

  res.json({
    success: true,
    data: labs.map((lab) => ({
      ...lab,
      computerCounts: byLab.get(lab._id.toString()) || {
        total: 0,
        available: 0,
        'in-use': 0,
        offline: 0,
        maintenance: 0
      }
    }))
  });
});

/** GET /api/labs/:id */
exports.getOne = asyncHandler(async (req, res) => {
  const lab = await Lab.findById(req.params.id);
  if (!lab) throw ApiError.notFound('Lab not found');

  const [computers, activeSessions] = await Promise.all([
    Computer.find({ lab: lab._id }).sort({ pcNumber: 1 }),
    LoginSession.countDocuments({ lab: lab._id, status: 'active' })
  ]);

  res.json({ success: true, data: { lab, computers, activeSessions } });
});

/** POST /api/labs */
exports.create = asyncHandler(async (req, res) => {
  const { code, name, location, capacity } = req.body;
  const lab = await Lab.create({ code, name, location, capacity });
  res.status(201).json({ success: true, data: lab });
});

/** PUT /api/labs/:id */
exports.update = asyncHandler(async (req, res) => {
  const lab = await Lab.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  if (!lab) throw ApiError.notFound('Lab not found');
  res.json({ success: true, data: lab });
});

/** DELETE /api/labs/:id - blocked while computers are still registered to it. */
exports.remove = asyncHandler(async (req, res) => {
  const lab = await Lab.findById(req.params.id);
  if (!lab) throw ApiError.notFound('Lab not found');

  const computerCount = await Computer.countDocuments({ lab: lab._id });
  if (computerCount > 0) {
    throw ApiError.conflict(
      `Move or delete the ${computerCount} computers in this lab before deleting it`
    );
  }

  await lab.deleteOne();
  res.json({ success: true, message: 'Lab deleted' });
});
