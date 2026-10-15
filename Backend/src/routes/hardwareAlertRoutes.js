const express = require('express');
const router = express.Router();
const alertController = require('../controllers/hardwareAlertController');
const agentAuth = require('../middleware/agentAuth');

router.post('/log-alert', agentAuth, alertController.createAlert);   // Agent -> Backend
router.get('/all', alertController.getAllAlerts);                    // Dashboard
router.put('/resolve/:alertId', alertController.resolveAlert);       // Dashboard

module.exports = router;
