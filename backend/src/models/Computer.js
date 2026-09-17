import mongoose from "mongoose";

const computerSchema = new mongoose.Schema({
    lab_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lab",
        required: true
    },

    pc_number: {
        type: String,
        required: true
    },

    hostname: String,

    ip_address: String,

    mac_address: String,

    status: {
        type: String,
        enum: [
            "AVAILABLE",
            "IN_USE",
            "OFFLINE",
            "MAINTENANCE"
        ],
        default: "AVAILABLE"
    },

    last_seen: Date,

    created_at: {
        type: Date,
        default: Date.now
    }
});

const Computer=mongoose.model("Computer",computerSchema);
export default Computer;