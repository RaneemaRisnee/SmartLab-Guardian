const mongoose = require('mongoose');
const HardwareRemovalAlert = require('../models/HardwareRemovalAlert');
const alertEvents = require('../utils/alertEvents');

const VALID_STATUSES = ['Pending', 'Reviewed', 'Dismissed'];

// POST /api/alerts/log-alert   (called by the client agent)
exports.createAlert = async (req, res) => {
  try {
    const { pc_id, hardware_id, device_name, device_type, removal_time } = req.body || {};

    if (!pc_id || !hardware_id || !device_name) {
      return res.status(400).json({ error: 'pc_id, hardware_id and device_name are required' });
    }

    // Do not create a second alert while the same device on the same PC is still Pending
    const existing = await HardwareRemovalAlert.findOne({ pc_id, hardware_id, resolved_status: 'Pending' });
    if (existing) {
      return res.status(200).json({ message: 'Alert already pending', alert: existing });
    }

    const parsedTime = removal_time ? new Date(removal_time) : new Date();
    const alert = await HardwareRemovalAlert.create({
      pc_id,
      hardware_id,
      device_name,
      device_type: device_type || 'Other',
      removal_time: isNaN(parsedTime) ? new Date() : parsedTime,
      // status is always Pending on creation; the client cannot choose it
    });

    alertEvents.broadcast('alert-created', { id: alert._id });
    res.status(201).json({ message: 'Alert created successfully', alert });
  } catch (err) {
    console.error('[createAlert]', err.message);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/alerts/stream        (Server-Sent Events: dashboard is notified instantly)
exports.streamAlerts = (req, res) => alertEvents.addClient(req, res);

// GET /api/alerts/all            (?status=Pending | Reviewed | Dismissed)
exports.getAllAlerts = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      if (!VALID_STATUSES.includes(req.query.status)) {
        return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
      }
      filter.resolved_status = req.query.status;
    }
    const alerts = await HardwareRemovalAlert.find(filter).sort({ removal_time: -1 });
    res.status(200).json(alerts);
  } catch (err) {
    console.error('[getAllAlerts]', err.message);
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/alerts/resolve/:alertId   body: { status: 'Reviewed' | 'Dismissed', admin_id? }
exports.resolveAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { status = 'Reviewed', admin_id } = req.body || {};

    if (!mongoose.isValidObjectId(alertId)) {
      return res.status(400).json({ error: 'Invalid alert id' });
    }
    if (!['Reviewed', 'Dismissed'].includes(status)) {
      return res.status(400).json({ error: "status must be 'Reviewed' or 'Dismissed'" });
    }

    const updated = await HardwareRemovalAlert.findByIdAndUpdate(
      alertId,
      { resolved_status: status, reviewed_by: admin_id || null, reviewed_time: new Date() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Alert not found' });

    alertEvents.broadcast('alert-resolved', { id: updated._id });
    res.status(200).json(updated);
  } catch (err) {
    console.error('[resolveAlert]', err.message);
    res.status(500).json({ error: err.message });
  }
};
