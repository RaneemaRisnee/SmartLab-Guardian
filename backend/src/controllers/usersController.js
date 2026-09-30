import User from "../models/Users.js";
import bcrypt from "bcryptjs";

// Get all users
export const getUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password_hash");
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Failed to get users", error: error.message });
    }
};

// Create user
export const createUser = async (req, res) => {
    try {
        const { username, password, role, full_name, email, status } = req.body;
        
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists with this username or email." });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            username,
            password_hash,
            role,
            full_name,
            email,
            status
        });

        // Don't return password hash
        const userResponse = newUser.toObject();
        delete userResponse.password_hash;

        res.status(201).json({
            message: "User created successfully",
            user: userResponse
        });
    } catch (error) {
        res.status(400).json({ message: "Failed to create user", error: error.message });
    }
};

// Update user
export const updateUser = async (req, res) => {
    try {
        const { password, ...updateData } = req.body;
        
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password_hash = await bcrypt.hash(password, salt);
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select("-password_hash");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "User updated successfully", user });
    } catch (error) {
        res.status(400).json({ message: "Failed to update user", error: error.message });
    }
};

// Delete user
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete user", error: error.message });
    }
};
