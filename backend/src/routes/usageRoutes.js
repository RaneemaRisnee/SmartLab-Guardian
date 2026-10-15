const express = require('express');
const router = express.Router();
const usageController = require('../controllers/usageController');

// POST routes to log data from client/agent
router.post('/app', usageController.logAppUsage);
router.post('/website', usageController.logWebsiteActivity);

// GET route to fetch session summary data
router.get('/session/:sessionId', usageController.getSessionUsage);

module.exports = router;