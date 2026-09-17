import LabSession from "../models/LabSession.js";
import Attendance from "../models/Attendance.js";


// Get all sessions
export const getSessions = async (req, res) => {
    try {
        const sessions = await LabSession.find()
            .populate("lab_id", "lab_name")
            .populate("lecturer_id", "full_name");

        res.status(200).json(sessions);
    } catch (error) {
        res.status(500).json({
            message: "Failed to get sessions",
            error: error.message
        });
    }
};


// Create session
export const createSession = async (req, res) => {
    try {
        const session = await LabSession.create(req.body);

        res.status(201).json({
            message: "Session created successfully",
            session
        });
    } catch (error) {
        res.status(400).json({
            message: "Failed to create session",
            error: error.message
        });
    }
};


// Start session
export const startSession = async (req, res) => {
    try {
        const session = await LabSession.findByIdAndUpdate(
            req.params.id,
            {
                status: "ACTIVE",
                start_time: new Date()
            },
            {
                new: true
            }
        );

        if (!session) {
            return res.status(404).json({
                message: "Session not found"
            });
        }

        res.status(200).json({
            message: "Session started successfully",
            session
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to start session",
            error: error.message
        });
    }
};


// End session and generate attendance report
export const endSession = async (req, res) => {
    try {

        const session = await LabSession.findByIdAndUpdate(
            req.params.id,
            {
                status: "COMPLETED",
                end_time: new Date()
            },
            {
                new: true
            }
        );

        if (!session) {
            return res.status(404).json({
                message: "Session not found"
            });
        }


        // Get attendance for this session
        const attendance = await Attendance.find({
            session_id: session._id
        })
        .populate("student_id", "student_number full_name")
        .populate("login_session_id");


        res.status(200).json({
            message: "Session ended successfully",
            session,
            attendance_report: attendance
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to end session",
            error: error.message
        });
    }
};