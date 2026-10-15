const express = require('express');
const controller = require('../controllers/alertController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', controller.list);
router.get('/summary', controller.summary);
router.put('/:id', authorize('admin'), controller.updateStatus);

module.exports = router;
