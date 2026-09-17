import Computer from "../models/Computer.js";


// Get all computers
export const getComputers = async (req, res) => {
    try {
        const computers = await Computer.find()
            .populate("lab_id", "lab_name");

        res.status(200).json(computers);
    } catch (error) {
        res.status(500).json({
            message: "Failed to get computers",
            error: error.message
        });
    }
};


// Get one computer
export const getComputerById = async (req, res) => {
    try {
        const computer = await Computer.findById(req.params.id)
            .populate("lab_id", "lab_name");

        if (!computer) {
            return res.status(404).json({
                message: "Computer not found"
            });
        }

        res.status(200).json(computer);
    } catch (error) {
        res.status(500).json({
            message: "Failed to get computer",
            error: error.message
        });
    }
};


// Create computer
export const createComputer = async (req, res) => {
    try {
        const computer = await Computer.create(req.body);

        res.status(201).json({
            message: "Computer created successfully",
            computer
        });
    } catch (error) {
        res.status(400).json({
            message: "Failed to create computer",
            error: error.message
        });
    }
};


// Update computer
export const updateComputer = async (req, res) => {
    try {
        const computer = await Computer.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!computer) {
            return res.status(404).json({
                message: "Computer not found"
            });
        }

        res.status(200).json({
            message: "Computer updated successfully",
            computer
        });
    } catch (error) {
        res.status(400).json({
            message: "Failed to update computer",
            error: error.message
        });
    }
};


// Delete computer
export const deleteComputer = async (req, res) => {
    try {
        const computer = await Computer.findByIdAndDelete(req.params.id);

        if (!computer) {
            return res.status(404).json({
                message: "Computer not found"
            });
        }

        res.status(200).json({
            message: "Computer deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to delete computer",
            error: error.message
        });
    }
};


// Get available computers
export const getAvailableComputers = async (req, res) => {
    try {
        const computers = await Computer.find({
            status: "AVAILABLE"
        });

        res.status(200).json(computers);
    } catch (error) {
        res.status(500).json({
            message: "Failed to get available computers",
            error: error.message
        });
    }
};