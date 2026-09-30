import User from "../models/Users.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// JWT Secret from env, fallback for development
const JWT_SECRET = process.env.JWT_SECRET || "smartlab_guardian_secret_key";

export const registerUser = async (req, res) => {
    try {
        const { username, password, role, full_name, email } = req.body;
        
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
            email
        });

        res.status(201).json({
            message: "User registered successfully",
            user: { id: newUser._id, username: newUser.username, role: newUser.role }
        });
    } catch (error) {
        res.status(500).json({ message: "Registration failed", error: error.message });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        if (user.status === "INACTIVE") {
            return res.status(403).json({ message: "Account is inactive" });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role, username: user.username },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            user: { id: user._id, username: user.username, role: user.role, full_name: user.full_name }
        });
    } catch (error) {
        res.status(500).json({ message: "Login failed", error: error.message });
    }
};
