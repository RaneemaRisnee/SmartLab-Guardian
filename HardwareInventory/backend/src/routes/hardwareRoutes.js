const express = require('express');
const {
  getAllHardware, getHardwareById, createHardware, updateHardware, deleteHardware
} = require('../controllers/hardwareController');

const router = express.Router();

router.route('/')
  .get(getAllHardware)
  .post(createHardware);

router.route('/:id')
  .get(getHardwareById)
  .put(updateHardware)
  .delete(deleteHardware);

module.exports = router;
