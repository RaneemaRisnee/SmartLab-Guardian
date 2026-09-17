import mongoose from "mongoose";

const hardwareDeviceSchema = new mongoose.Schema({
    computer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Computer",
        required: true
    },

    device_type: {
        type: String,
        required: true
    },

    hardware_identifier: String,

    device_name: String,

    manufacturer: String,

    model: String,

    device_condition: {
        type: String,
        enum: [
            "GOOD",
            "DAMAGED",
            "NEEDS_REPAIR"
        ],
        default: "GOOD"
    },

    status: {
        type: String,
        enum: [
            "CONNECTED",
            "REMOVED",
            "MISSING"
        ],
        default: "CONNECTED"
    },

    registered_at: {
        type: Date,
        default: Date.now
    }
});

const HardwareDevice = mongoose.model("HardwareDevice",hardwareDeviceSchema);

export default HardwareDevice;