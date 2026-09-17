import express from "express";

import {
    getHardware,
    getComputerHardware,
    createHardware,
    updateHardware
} from "../controllers/hardwareController.js";

const router = express.Router();

router.get("/", getHardware);

router.get("/computer/:computerId", getComputerHardware);

router.post("/", createHardware);

router.put("/:id", updateHardware);

export default router;