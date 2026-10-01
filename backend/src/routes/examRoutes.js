const express = require('express');
const controller = require('../controllers/examController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();
const staff = authorize('admin', 'examiner');

router.use(protect);

router.get('/', controller.list);
router.get('/:id', controller.getOne);

router.post('/', staff, controller.create);
router.put('/:id', staff, controller.update);
router.delete('/:id', staff, controller.remove);

router.post('/:id/candidates', staff, upload.single('file'), controller.importCandidates);
router.post('/:id/assign', staff, controller.assign);
router.post('/:id/sign-in', staff, controller.signInAll);
router.post('/:id/end', staff, controller.endExam);
router.put('/:id/assignments/:assignmentId', staff, controller.reassign);

module.exports = router;
