import mongoose from "mongoose";

const examSessionSchema = new mongoose.Schema({
    exam_name: {
        type: String,
        required: true
    },

    lab_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lab",
        required: true
    },

    exam_date: {
        type: Date,
        required: true
    },

    start_time: {
        type: String,
        required: true
    },

    end_time: {
        type: String,
        required: true
    },

    status: {
        type: String,
        enum: [
            "SCHEDULED",
            "ACTIVE",
            "COMPLETED",
            "CANCELLED"
        ],
        default: "SCHEDULED"
    },

    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
});

const ExamSession=mongoose.model("ExamSession",examSessionSchema);
export default ExamSession;