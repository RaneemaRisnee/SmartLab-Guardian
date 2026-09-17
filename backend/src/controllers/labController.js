import Lab from "../models/Lab.js";

export const getLabs = async (req, res) => {
    try {
        const labs = await Lab.find();

        res.status(200).json(labs);
    } catch (error) {
        res.status(500).json({
            message: "Failed to get labs",
            error: error.message
        });
    }
};


export const getLabById = async (req, res) => {
    try {
        const lab = await Lab.findById(req.params.id);

        if (!lab) {
            return res.status(404).json({
                message: "Lab not found"
            });
        }

        res.status(200).json(lab);
    } catch (error) {
        res.status(500).json({
            message: "Failed to get lab",
            error: error.message
        });
    }
};


export const createLab = async (req, res) => {
    try {
        const lab = await Lab.create(req.body);

        res.status(201).json({
            message: "Lab created successfully",
            lab
        });
    } catch (error) {
        res.status(400).json({
            message: "Failed to create lab",
            error: error.message
        });
    }
};


export const updateLab = async (req, res) => {
    try {
        const lab = await Lab.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!lab) {
            return res.status(404).json({
                message: "Lab not found"
            });
        }

        res.status(200).json({
            message: "Lab updated successfully",
            lab
        });
    } catch (error) {
        res.status(400).json({
            message: "Failed to update lab",
            error: error.message
        });
    }
};


export const deleteLab = async (req, res) => {
    try {
        const lab = await Lab.findByIdAndDelete(req.params.id);

        if (!lab) {
            return res.status(404).json({
                message: "Lab not found"
            });
        }

        res.status(200).json({
            message: "Lab deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to delete lab",
            error: error.message
        });
    }
};