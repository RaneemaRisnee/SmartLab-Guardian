import mongoose from "mongoose";

const hardwareRemovalAlertSchema = new mongoose.Schema({
    hardware_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HardwareDevice",
        required: true
    },

    computer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Computer",
        required: true
    },

    detected_at: {
        type: Date,
        default: Date.now
    },

    previous_status: String,

    current_status: String,

    description: String,

    status: {
        type: String,
        enum: [
            "OPEN",
            "RESOLVED",
            "IGNORED"
        ],
        default: "OPEN"
    }
});

const Computer=mongoose.model("HardwareRemovalAlert",hardwareRemovalAlertSchema);
export default Computer;