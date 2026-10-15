const express = require('express');
const controller = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/login', controller.login);

router.use(protect);
router.get('/me', controller.me);
router.put('/password', controller.changePassword);

router.get('/users', authorize('admin'), controller.listUsers);
router.post('/users', authorize('admin'), controller.createUser);
router.put('/users/:id', authorize('admin'), controller.updateUser);

module.exports = router;
