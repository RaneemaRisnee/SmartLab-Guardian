import HardwareDevice from "../models/HardwareDevice.js";


// Get all hardware
export const getHardware = async (req, res) => {
    try {
        const hardware = await HardwareDevice.find()
            .populate("computer_id", "pc_number hostname");

        res.status(200).json(hardware);
    } catch (error) {
        res.status(500).json({
            message: "Failed to get hardware",
            error: error.message
        });
    }
};


// Get hardware for a computer
export const getComputerHardware = async (req, res) => {
    try {
        const hardware = await HardwareDevice.find({
            computer_id: req.params.computerId
        });

        res.status(200).json(hardware);
    } catch (error) {
        res.status(500).json({
            message: "Failed to get computer hardware",
            error: error.message
        });
    }
};


// Register hardware
export const createHardware = async (req, res) => {
    try {
        const hardware = await HardwareDevice.create(req.body);

        res.status(201).json({
            message: "Hardware registered successfully",
            hardware
        });
    } catch (error) {
        res.status(400).json({
            message: "Failed to register hardware",
            error: error.message
        });
    }
};


// Update hardware
export const updateHardware = async (req, res) => {
    try {
        const hardware = await HardwareDevice.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!hardware) {
            return res.status(404).json({
                message: "Hardware not found"
            });
        }

        res.status(200).json({
            message: "Hardware updated successfully",
            hardware
        });
    } catch (error) {
        res.status(400).json({
            message: "Failed to update hardware",
            error: error.message
        });
    }
};