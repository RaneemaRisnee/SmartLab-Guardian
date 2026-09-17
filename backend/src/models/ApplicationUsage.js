import mongoose from "mongoose";

const applicationUsageSchema = new mongoose.Schema({
    login_session_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LoginSession",
        required: true
    },

    application_name: {
        type: String,
        required: true
    },

    start_time: {
        type: Date,
        required: true
    },

    end_time: Date,

    duration_seconds: {
        type: Number,
        default: 0
    }
});

const ApplicationUsage=mongoose.model("ApplicationUsage",applicationUsageSchema);
export default ApplicationUsage;