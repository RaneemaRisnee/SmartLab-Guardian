import Attendance from "../models/Attendance.js";


// Get attendance for a session
export const getSessionAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.find({
            session_id: req.params.sessionId
        })
        .populate("student_id", "student_number full_name")
        .populate("login_session_id");

        res.status(200).json(attendance);
    } catch (error) {
        res.status(500).json({
            message: "Failed to get attendance",
            error: error.message
        });
    }
};


// Mark attendance
export const markAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.create(req.body);

        res.status(201).json({
            message: "Attendance marked successfully",
            attendance
        });
    } catch (error) {
        res.status(400).json({
            message: "Failed to mark attendance",
            error: error.message
        });
    }
};