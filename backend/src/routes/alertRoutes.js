import express from "express";

import {
    getAlerts,
    getOpenAlerts,
    createAlert,
    resolveAlert
} from "../controllers/alertController.js";

const router = express.Router();

router.get("/", getAlerts);

router.get("/open", getOpenAlerts);

router.post("/", createAlert);

router.put("/:id/resolve", resolveAlert);

export default router;