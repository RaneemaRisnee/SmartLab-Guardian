import mongoose from "mongoose";

const labSchema = new mongoose.Schema({
    lab_name: {
        type: String,
        required: true,
        unique: true
    },

    location: String,

    description: String,

    status: {
        type: String,
        enum: ["ACTIVE", "INACTIVE"],
        default: "ACTIVE"
    }
});


const Lab=mongoose.model("Lab",labSchema);
export default Lab;