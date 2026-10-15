const express = require('express');
const controller = require('../controllers/computerController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.get('/', controller.list);
router.get('/:id', controller.getOne);

router.post('/', authorize('admin'), controller.create);
router.post('/import', authorize('admin'), upload.single('file'), controller.importFromExcel);
router.put('/:id', authorize('admin'), controller.update);
router.delete('/:id', authorize('admin'), controller.remove);

module.exports = router;
