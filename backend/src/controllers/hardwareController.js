const mongoose = require('mongoose');
const { Computer, HardwareDevice, HardwareRemovalAlert } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { inventorySummary } = require('../services/hardwareService');

/** GET /api/hardware - the inventory register. */
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 50 });
  const filter = {};

  if (req.query.lab) filter.lab = req.query.lab;
  if (req.query.computer) filter.computer = req.query.computer;
  if (req.query.deviceType) filter.deviceType = req.query.deviceType;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.condition) filter.condition = req.query.condition;
  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ hardwareId: rx }, { serialNumber: rx }, { model: rx }, { vendor: rx }];
  }

  const [items, total] = await Promise.all([
    HardwareDevice.find(filter)
      .populate('computer', 'pcNumber')
      .populate('lab', 'code name')
      .sort({ hardwareId: 1 })
      .skip(skip)
      .limit(limit),
    HardwareDevice.countDocuments(filter)
  ]);

  res.json({ success: true, data: paginatedResponse(items, total, { page, limit }) });
});

/** GET /api/hardware/summary - counts for the inventory cards. */
exports.summary = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.lab && mongoose.isValidObjectId(req.query.lab)) {
    filter.lab = new mongoose.Types.ObjectId(String(req.query.lab));
  }

  const [summary, openAlerts] = await Promise.all([
    inventorySummary(filter),
    HardwareRemovalAlert.countDocuments({ status: 'open' })
  ]);

  res.json({ success: true, data: { ...summary, openAlerts } });
});

/** GET /api/hardware/:id */
exports.getOne = asyncHandler(async (req, res) => {
  const device = await HardwareDevice.findById(req.params.id)
    .populate('computer', 'pcNumber hostname')
    .populate('lab', 'code name');
  if (!device) throw ApiError.notFound('Hardware device not found');

  const alerts = await HardwareRemovalAlert.find({ hardwareDevice: device._id })
    .sort({ removalTime: -1 })
    .limit(20);

  res.json({ success: true, data: { device, alerts } });
});

/**
 * POST /api/hardware - register a device. Attaching it to a PC also copies
 * that PC's lab onto the device, so inventory can be filtered by lab without
 * a second lookup.
 */
exports.create = asyncHandler(async (req, res) => {
  const payload = { ...req.body };

  if (payload.computer) {
    const computer = await Computer.findById(payload.computer);
    if (!computer) throw ApiError.badRequest('Computer not found');
    payload.lab = computer.lab;
    if (!payload.status) payload.status = 'connected';
  } else {
    payload.computer = null;
  }

  const device = await HardwareDevice.create(payload);
  res.status(201).json({ success: true, data: device });
});

/** PUT /api/hardware/:id */
exports.update = asyncHandler(async (req, res) => {
  const device = await HardwareDevice.findById(req.params.id);
  if (!device) throw ApiError.notFound('Hardware device not found');

  const payload = { ...req.body };

  if (payload.computer) {
    const computer = await Computer.findById(payload.computer);
    if (!computer) throw ApiError.badRequest('Computer not found');
    payload.lab = computer.lab;
  } else if (payload.computer === null || payload.computer === '') {
    payload.computer = null;
    payload.lab = null;
  }

  Object.assign(device, payload);
  await device.save();

  res.json({ success: true, data: device });
});

/** DELETE /api/hardware/:id - also clears the alert history for that device. */
exports.remove = asyncHandler(async (req, res) => {
  const device = await HardwareDevice.findById(req.params.id);
  if (!device) throw ApiError.notFound('Hardware device not found');

  await HardwareRemovalAlert.deleteMany({ hardwareDevice: device._id });
  await device.deleteOne();

  res.json({ success: true, message: 'Hardware device and its alerts deleted' });
});
