import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import studentRoutes from "./routes/studentRoutes.js";
import labRoutes from "./routes/labRoutes.js";
import computerRoutes from "./routes/computerRoutes.js";
import hardwareRoutes from "./routes/hardwareRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
dotenv.config();

const app=express();
app.use(express.json());
const MONGOURL='mongodb://localhost:27017/';
const PORT=5000;

app.use("/api/students", studentRoutes);
app.use("/api/labs", labRoutes);
app.use("/api/computers", computerRoutes);
app.use("/api/hardware", hardwareRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/alerts", alertRoutes);
//const MONGOURL=;
mongoose
.connect(MONGOURL)
.then(()=>{
    console.log("Data base connected successfully");
    app.listen(PORT,()=>{
        console.log(`Server running on port ${PORT}`);

    });
}).catch((err)=>{console.error("Database connection failed:",err.message);
    process.exit(1);
});

app.get("/",(req,res)=>{
    res.json({
        success:true,
        message:"SmartLab GUardian api is running",
    });
});

