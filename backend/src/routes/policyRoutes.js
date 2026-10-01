const express = require('express');
const controller = require('../controllers/policyController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', controller.list);
router.get('/effective', controller.effective);
router.put('/', authorize('admin', 'lecturer'), controller.upsert);
router.delete('/:id', authorize('admin'), controller.remove);

module.exports = router;
