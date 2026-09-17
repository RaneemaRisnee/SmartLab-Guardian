import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },

    password_hash: {
        type: String,
        required: true
    },

    role: {
        type: String,
        enum: ["ADMIN", "LECTURER", "EXAMINER"],
        required: true
    },

    full_name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        unique: true
    },

    status: {
        type: String,
        enum: ["ACTIVE", "INACTIVE"],
        default: "ACTIVE"
    },

    created_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("User", userSchema);

const Users=mongoose.model("Users",userSchema);
export default Users;