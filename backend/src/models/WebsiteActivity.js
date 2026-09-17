const mongoose = require('mongoose');

const websiteActivitySchema = new mongoose.Schema({
  session_id: { type: mongoose.Schema.Types.ObjectId, ref: 'LoginSession', required: true },
  url: { type: String, required: true },
  visit_time: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WebsiteActivity', websiteActivitySchema);
//[cite 2,3]