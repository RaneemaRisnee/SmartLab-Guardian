import mongoose from "mongoose";

const studentSchema= new mongoose.Schema({
    student_number:{
        type:String,
        required:true,
        unique:true
    },
    full_name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        unique:true
    },

    department:String,
    
    status:{
        type:String,
        enum:["ACTIVE","INACTIVE"],
        default:["INACTIVE"]
    },
    created_at:{
        type:Date,
        default:Date.now
    }
});

const Student=mongoose.model("Student",studentSchema);
export default Student;