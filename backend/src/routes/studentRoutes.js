import express from "express";

import {
    getStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent
} from "../controllers/studentController.js";

const router = express.Router();

router.get("/", getStudents);

router.get("/:id", getStudentById);

router.post("/", createStudent);

router.put("/:id", updateStudent);

router.delete("/:id", deleteStudent);

export default router;