import mongoose from "mongoose";

const examAssignmentSchema = new mongoose.Schema({
    exam_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ExamSession",
        required: true
    },

    student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true
    },

    computer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Computer",
        required: true
    },

    assigned_at: {
        type: Date,
        default: Date.now
    },

    status: {
        type: String,
        enum: [
            "ASSIGNED",
            "LOGGED_IN",
            "COMPLETED",
            "MISMATCH"
        ],
        default: "ASSIGNED"
    },

    login_time: Date,

    logout_time: Date
});

const ExamAssignment=mongoose.Model("ExamAssignment",examAssignmentSchema);
export default ExamAssignment;