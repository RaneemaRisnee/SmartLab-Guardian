import mongoose from "mongoose";

const labSessionSchema = new mongoose.Schema({
    lab_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lab",
        required: true
    },

    lecturer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    session_name: {
        type: String,
        required: true
    },

    session_type: {
        type: String,
        enum: ["LAB", "PRACTICAL", "EXAM"],
        required: true
    },

    start_time: Date,

    end_time: Date,

    status: {
        type: String,
        enum: [
            "SCHEDULED",
            "ACTIVE",
            "COMPLETED",
            "CANCELLED"
        ],
        default: "SCHEDULED"
    }
});

const LabSession=mongoose.model("LabSession",labSessionSchema);
export default LabSession;
