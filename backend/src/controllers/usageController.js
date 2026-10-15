const ApplicationUsage = require('../models/ApplicationUsage');
const WebsiteActivity = require('../models/WebsiteActivity');

// Log application usage sent by monitoring agent
exports.logAppUsage = async (req, res) => {
  try {
    const { session_id, app_name, start_time, duration } = req.body;
    const usage = await ApplicationUsage.create({ session_id, app_name, start_time, duration });
    res.status(201).json({ success: true, data: usage });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Log website activity sent by monitoring agent
exports.logWebsiteActivity = async (req, res) => {
  try {
    const { session_id, url, visit_time } = req.body;
    const activity = await WebsiteActivity.create({ session_id, url, visit_time });
    res.status(201).json({ success: true, data: activity });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Fetch usage data for a specific session
exports.getSessionUsage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const apps = await ApplicationUsage.find({ session_id: sessionId });
    const websites = await WebsiteActivity.find({ session_id: sessionId });
    
    res.status(200).json({ 
      success: true, 
      data: { applications: apps, websites } 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};