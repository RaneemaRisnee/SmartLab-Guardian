const express = require('express');
const controller = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', controller.list);
router.get('/summary', controller.summary);
router.put('/:id', authorize('admin', 'lecturer'), controller.override);

module.exports = router;
