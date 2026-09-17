import express from "express";

import {
    getLabs,
    getLabById,
    createLab,
    updateLab,
    deleteLab
} from "../controllers/labController.js";

const router = express.Router();

router.get("/", getLabs);

router.get("/:id", getLabById);

router.post("/", createLab);

router.put("/:id", updateLab);

router.delete("/:id", deleteLab);

export default router;
