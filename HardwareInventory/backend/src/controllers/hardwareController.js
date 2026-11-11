const mongoose = require('mongoose');
const Hardware = require('../models/Hardware');

const allowedFields = [
  'hardware_id', 'hardware_name', 'category', 'brand', 'model',
  'processor', 'ram', 'storage', 'status', 'location', 'notes'
];

function pickAllowedFields(body) {
  const result = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) return result;
  for (const key of allowedFields) {
    if (body[key] !== undefined) result[key] = body[key];
  }
  return result;
}

exports.getAllHardware = async (req, res, next) => {
  try {
    const { search = '', status = '', category = '' } = req.query;
    if ([search, status, category].some((value) => typeof value !== 'string')) {
      return res.status(400).json({ message: 'Search, status, and category must each be a single string value' });
    }
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { hardware_id: regex }, { hardware_name: regex },
        { category: regex }, { brand: regex }, { model: regex },
        { location: regex }
      ];
    }
    const hardware = await Hardware.find(filter).sort({ updatedAt: -1 });
    res.json(hardware);
  } catch (err) { next(err); }
};

exports.getHardwareById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid hardware record ID' });
    }
    const hardware = await Hardware.findById(req.params.id);
    if (!hardware) return res.status(404).json({ message: 'Hardware not found' });
    res.json(hardware);
  } catch (err) { next(err); }
};

exports.createHardware = async (req, res, next) => {
  try {
    const payload = pickAllowedFields(req.body);
    const hardware = await Hardware.create(payload);
    res.status(201).json({ message: 'Hardware created successfully', hardware });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Hardware ID already exists. Use a unique ID.' });
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    next(err);
  }
};

exports.updateHardware = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid hardware record ID' });
    }
    const updates = pickAllowedFields(req.body);
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Provide at least one hardware field to update' });
    }
    const hardware = await Hardware.findByIdAndUpdate(
      req.params.id, updates,
      { new: true, runValidators: true }
    );
    if (!hardware) return res.status(404).json({ message: 'Hardware not found' });
    res.json({ message: 'Hardware updated successfully', hardware });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Hardware ID already exists. Use a unique ID.' });
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    next(err);
  }
};

exports.deleteHardware = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid hardware record ID' });
    }
    const hardware = await Hardware.findByIdAndDelete(req.params.id);
    if (!hardware) return res.status(404).json({ message: 'Hardware not found' });
    res.json({ message: 'Hardware deleted successfully' });
  } catch (err) { next(err); }
};
