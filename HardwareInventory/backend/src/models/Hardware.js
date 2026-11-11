const mongoose = require('mongoose');

const STATUSES = ['Working', 'Repair', 'Damaged', 'Unavailable'];
const CATEGORIES = ['Computer', 'Monitor', 'Keyboard', 'Mouse', 'Printer', 'Projector', 'Network Device', 'Other'];

const hardwareSchema = new mongoose.Schema({
  hardware_id: {
    type: String, required: [true, 'Hardware ID is required'],
    unique: true, trim: true, uppercase: true, maxlength: 40
  },
  hardware_name: {
    type: String, required: [true, 'Hardware name is required'],
    trim: true, maxlength: 120
  },
  category: {
    type: String, required: [true, 'Category is required'],
    enum: CATEGORIES
  },
  brand: { type: String, trim: true, maxlength: 80, default: '' },
  model: { type: String, trim: true, maxlength: 100, default: '' },
  processor: { type: String, trim: true, maxlength: 100, default: '' },
  ram: { type: String, trim: true, maxlength: 40, default: '' },
  storage: { type: String, trim: true, maxlength: 60, default: '' },
  status: { type: String, enum: STATUSES, default: 'Working' },
  location: { type: String, trim: true, maxlength: 120, default: '' },
  notes: { type: String, trim: true, maxlength: 1000, default: '' }
}, { timestamps: true });

hardwareSchema.index({ hardware_name: 'text', hardware_id: 'text', brand: 'text', model: 'text' });

module.exports = mongoose.model('Hardware', hardwareSchema);
