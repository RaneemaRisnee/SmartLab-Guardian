const express = require('express');
const controller = require('../controllers/monitoringSessionController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);
router.get('/', controller.list);
router.post('/', authorize('admin', 'lecturer', 'examiner'), controller.create);
router.put('/:id/end', authorize('admin', 'lecturer', 'examiner'), controller.end);

module.exports = router;
