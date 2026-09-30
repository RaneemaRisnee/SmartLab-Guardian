import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./src/models/Users.js";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const MONGOURL = 'mongodb://localhost:27017/';

const seedUsers = async () => {
    try {
        await mongoose.connect(MONGOURL);
        console.log("Connected to DB");

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash("password123", salt);

        const usersToCreate = [
            {
                username: "admin",
                password_hash,
                role: "ADMIN",
                full_name: "System Admin",
                email: "admin@smartlab.edu"
            },
            {
                username: "lecturer",
                password_hash,
                role: "LECTURER",
                full_name: "John Lecturer",
                email: "lecturer@smartlab.edu"
            },
            {
                username: "examiner",
                password_hash,
                role: "EXAMINER",
                full_name: "Jane Examiner",
                email: "examiner@smartlab.edu"
            },
            {
                username: "student",
                password_hash,
                role: "STUDENT",
                full_name: "Alice Student",
                email: "student@smartlab.edu"
            }
        ];

        for (const user of usersToCreate) {
            const exists = await User.findOne({ username: user.username });
            if (!exists) {
                await User.create(user);
                console.log(`Created user: ${user.username}`);
            } else {
                console.log(`User already exists: ${user.username}`);
            }
        }

        console.log("Seeding complete!");
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
};

seedUsers();
