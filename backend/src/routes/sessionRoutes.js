const express = require('express');
const controller = require('../controllers/sessionController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', controller.list);
router.get('/live', controller.live);
router.get('/:id', controller.getOne);

router.post('/', authorize('admin', 'examiner', 'lecturer'), controller.create);
router.put('/:id/end', authorize('admin', 'examiner', 'lecturer'), controller.end);
router.put('/:id/review', authorize('admin', 'lecturer'), controller.review);

module.exports = router;
