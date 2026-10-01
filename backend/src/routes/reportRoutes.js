const express = require('express');
const controller = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/usage', controller.usage);
router.get('/attendance', controller.attendance);
router.get('/hardware', controller.hardware);

router.get('/', controller.listSaved);
router.get('/saved/:id', controller.getSaved);
router.post('/', controller.save);
router.post('/export', controller.exportExcel);
router.delete('/:id', authorize('admin', 'lecturer', 'examiner'), controller.removeSaved);

module.exports = router;
