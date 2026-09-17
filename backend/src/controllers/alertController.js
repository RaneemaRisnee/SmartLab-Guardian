import Alert from "../models/Alert.js";


// Get all alerts
export const getAlerts = async (req, res) => {
    try {
        const alerts = await Alert.find()
            .populate("student_id", "student_number full_name")
            .populate("computer_id", "pc_number")
            .sort({ created_at: -1 });

        res.status(200).json(alerts);
    } catch (error) {
        res.status(500).json({
            message: "Failed to get alerts",
            error: error.message
        });
    }
};


// Get open alerts
export const getOpenAlerts = async (req, res) => {
    try {
        const alerts = await Alert.find({
            status: "OPEN"
        })
        .populate("student_id", "student_number full_name")
        .populate("computer_id", "pc_number")
        .sort({ created_at: -1 });

        res.status(200).json(alerts);
    } catch (error) {
        res.status(500).json({
            message: "Failed to get open alerts",
            error: error.message
        });
    }
};


// Create alert
export const createAlert = async (req, res) => {
    try {
        const alert = await Alert.create(req.body);

        res.status(201).json({
            message: "Alert created successfully",
            alert
        });
    } catch (error) {
        res.status(400).json({
            message: "Failed to create alert",
            error: error.message
        });
    }
};


// Resolve alert
export const resolveAlert = async (req, res) => {
    try {
        const alert = await Alert.findByIdAndUpdate(
            req.params.id,
            {
                status: "RESOLVED",
                resolved_at: new Date()
            },
            {
                new: true
            }
        );

        if (!alert) {
            return res.status(404).json({
                message: "Alert not found"
            });
        }

        res.status(200).json({
            message: "Alert resolved successfully",
            alert
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to resolve alert",
            error: error.message
        });
    }
};