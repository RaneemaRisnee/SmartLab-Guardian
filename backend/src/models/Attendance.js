import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
    session_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LabSession",
        required: true
    },

    student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true
    },

    login_session_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LoginSession"
    },

    status: {
        type: String,
        enum: [
            "PRESENT",
            "ABSENT",
            "LATE",
            "FLAGGED"
        ],
        required: true
    },

    marked_at: {
        type: Date,
        default: Date.now
    }
});

const Attendance=mongoose.model("Attendance",attendanceSchema);
export default Attendance;