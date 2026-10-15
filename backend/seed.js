import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./src/models/Users.js";
import Student from "./src/models/Student.js";
import Lab from "./src/models/Lab.js";
import Computer from "./src/models/Computer.js";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const MONGOURL = process.env.MONGOURL || 'mongodb://localhost:27017/smartlab_guardian';

const seedDatabase = async () => {
    try {
        await mongoose.connect(MONGOURL);
        console.log("Connected to DB");

        // --- SEED USERS ---
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash("password123", salt);

        const usersToCreate = [
            { username: "admin", password_hash, role: "ADMIN", full_name: "System Admin", email: "admin@smartlab.edu" },
            { username: "lecturer", password_hash, role: "LECTURER", full_name: "John Lecturer", email: "lecturer@smartlab.edu" },
            { username: "examiner", password_hash, role: "EXAMINER", full_name: "Jane Examiner", email: "examiner@smartlab.edu" },
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

        // --- SEED STUDENTS ---
        const studentsToCreate = [
            { student_number: "STU001", full_name: "Alice Fernando", email: "alice@student.edu", department: "Computer Science", status: "ACTIVE" },
            { student_number: "STU002", full_name: "Bob Perera", email: "bob@student.edu", department: "Computer Science", status: "ACTIVE" },
            { student_number: "STU003", full_name: "Charlie Silva", email: "charlie@student.edu", department: "IT", status: "ACTIVE" },
            { student_number: "STU004", full_name: "Diana Jayawardena", email: "diana@student.edu", department: "IT", status: "ACTIVE" },
            { student_number: "STU005", full_name: "Edward Bandara", email: "edward@student.edu", department: "Computer Science", status: "INACTIVE" },
        ];

        for (const student of studentsToCreate) {
            const exists = await Student.findOne({ student_number: student.student_number });
            if (!exists) {
                await Student.create(student);
                console.log(`Created student: ${student.student_number}`);
            } else {
                console.log(`Student already exists: ${student.student_number}`);
            }
        }

        // --- SEED LABS ---
        const labsToCreate = [
            { lab_name: "Lab A", location: "Building 1, Floor 2", description: "Main computer lab", status: "ACTIVE" },
            { lab_name: "Lab B", location: "Building 1, Floor 3", description: "Secondary computer lab", status: "ACTIVE" },
            { lab_name: "Lab C", location: "Building 2, Floor 1", description: "Exam lab", status: "ACTIVE" },
        ];

        const createdLabs = [];
        for (const lab of labsToCreate) {
            const exists = await Lab.findOne({ lab_name: lab.lab_name });
            if (!exists) {
                const created = await Lab.create(lab);
                createdLabs.push(created);
                console.log(`Created lab: ${lab.lab_name}`);
            } else {
                createdLabs.push(exists);
                console.log(`Lab already exists: ${lab.lab_name}`);
            }
        }

        // --- SEED COMPUTERS ---
        const labA = createdLabs[0];
        const labB = createdLabs[1];

        const computersToCreate = [
            { lab_id: labA._id, pc_number: "PC-A01", hostname: "LAB-A-PC01", ip_address: "192.168.1.101", status: "AVAILABLE" },
            { lab_id: labA._id, pc_number: "PC-A02", hostname: "LAB-A-PC02", ip_address: "192.168.1.102", status: "AVAILABLE" },
            { lab_id: labA._id, pc_number: "PC-A03", hostname: "LAB-A-PC03", ip_address: "192.168.1.103", status: "IN_USE" },
            { lab_id: labA._id, pc_number: "PC-A04", hostname: "LAB-A-PC04", ip_address: "192.168.1.104", status: "OFFLINE" },
            { lab_id: labB._id, pc_number: "PC-B01", hostname: "LAB-B-PC01", ip_address: "192.168.2.101", status: "AVAILABLE" },
            { lab_id: labB._id, pc_number: "PC-B02", hostname: "LAB-B-PC02", ip_address: "192.168.2.102", status: "MAINTENANCE" },
        ];

        for (const comp of computersToCreate) {
            const exists = await Computer.findOne({ pc_number: comp.pc_number });
            if (!exists) {
                await Computer.create(comp);
                console.log(`Created computer: ${comp.pc_number}`);
            } else {
                console.log(`Computer already exists: ${comp.pc_number}`);
            }
        }

        console.log("\n Seeding complete!");
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error.message);
        process.exit(1);
    }
};

seedDatabase();
