import mongoose from "mongoose";

const alertSchema = new mongoose.Schema({
    student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student"
    },

    computer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Computer"
    },

    login_session_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LoginSession"
    },

    alert_type: {
        type: String,
        required: true
    },

    severity: {
        type: String,
        enum: [
            "LOW",
            "MEDIUM",
            "HIGH",
            "CRITICAL"
        ],
        default: "MEDIUM"
    },

    message: {
        type: String,
        required: true
    },

    created_at: {
        type: Date,
        default: Date.now
    },

    status: {
        type: String,
        enum: [
            "OPEN",
            "RESOLVED",
            "IGNORED"
        ],
        default: "OPEN"
    },

    resolved_at: Date
});


const Alert=mongoose.model("Alert",alertSchema);
export default Alert;