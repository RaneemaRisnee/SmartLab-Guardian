const express = require('express');

const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/students', require('./studentRoutes'));
router.use('/labs', require('./labRoutes'));
router.use('/computers', require('./computerRoutes'));
router.use('/sessions', require('./sessionRoutes'));
router.use('/attendance', require('./attendanceRoutes'));
router.use('/hardware', require('./hardwareRoutes'));
router.use('/alerts', require('./alertRoutes'));
router.use('/exams', require('./examRoutes'));
router.use('/reports', require('./reportRoutes'));
router.use('/policies', require('./policyRoutes'));

// Called by the monitoring agent on each lab PC, not by the dashboard.
router.use('/agent', require('./agentRoutes'));

module.exports = router;
