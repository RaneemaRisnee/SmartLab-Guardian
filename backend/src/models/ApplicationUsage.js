const mongoose = require('mongoose');

const applicationUsageSchema = new mongoose.Schema({
  session_id: { type: mongoose.Schema.Types.ObjectId, ref: 'LoginSession', required: true },
  app_name: { type: String, required: true },
  start_time: { type: Date, default: Date.now },
  duration: { type: Number, required: true } // Duration in seconds or minutes
});

module.exports = mongoose.model('ApplicationUsage', applicationUsageSchema);