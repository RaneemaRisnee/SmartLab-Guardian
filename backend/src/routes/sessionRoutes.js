import express from "express";

import {
    getSessions,
    createSession,
    startSession,
    endSession
} from "../controllers/sessionController.js";

const router = express.Router();

router.get("/", getSessions);

router.post("/", createSession);

router.put("/:id/start", startSession);

router.put("/:id/end", endSession);

export default router;
