const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/agentController');
const agentAuth = require('../middleware/agentAuth');

const router = express.Router();

/**
 * Lab PCs report frequently, so the limit is generous - it exists to stop a
 * misconfigured agent from flooding the server, not to throttle normal use.
 */
const agentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Monitoring agent is reporting too frequently' }
});

router.use(agentAuth, agentLimiter);

router.post('/heartbeat', controller.heartbeat);
router.post('/login', controller.studentLogin);
router.post('/logout', controller.studentLogout);
router.post('/activity', controller.activity);
router.post('/hardware-scan', controller.hardwareScan);
router.post('/exam-sign-in', controller.examSignIn);

module.exports = router;
