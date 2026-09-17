import express from "express";

import {
    getSessionAttendance,
    markAttendance
} from "../controllers/attendanceController.js";

const router = express.Router();

router.get("/session/:sessionId", getSessionAttendance);

router.post("/", markAttendance);

export default router;