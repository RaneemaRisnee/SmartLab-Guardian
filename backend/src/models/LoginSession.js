import mongoose from "mongoose";


const loginSessionSchema = new mongoose.Schema({
    session_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LabSession"
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

    login_time: {
        type: Date,
        default: Date.now
    },

    logout_time: Date,

    active_time: {
        type: Number,
        default: 0
    },

    idle_time: {
        type: Number,
        default: 0
    },

    status: {
        type: String,
        enum: ["ACTIVE", "COMPLETED", "ABNORMAL"],
        default: "ACTIVE"
    }
});

const LoginSession=mongoose.model("LoginSession",loginSessionSchema);
export default LoginSession;