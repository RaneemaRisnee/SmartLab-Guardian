const express = require('express');
const router = express.Router();
const controller = require('../controllers/monitoringController');
const agentAuth = require('../middleware/agentAuth');

router.post('/sessions/start', agentAuth, controller.startSession);
router.post('/sessions/:sessionId/batches', agentAuth, controller.receiveBatch);

module.exports = router;
