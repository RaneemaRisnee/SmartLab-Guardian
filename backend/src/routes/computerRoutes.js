import express from "express";

import {
    getComputers,
    getComputerById,
    createComputer,
    updateComputer,
    deleteComputer,
    getAvailableComputers
} from "../controllers/computerController.js";

const router = express.Router();

router.get("/", getComputers);

router.get("/available", getAvailableComputers);

router.get("/:id", getComputerById);

router.post("/", createComputer);

router.put("/:id", updateComputer);

router.delete("/:id", deleteComputer);

export default router;