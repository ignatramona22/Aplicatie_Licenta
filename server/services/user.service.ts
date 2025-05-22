import userModel from "../models/user_model"
import { Response } from "express";
import { redis } from "../utils/redis";
import { create } from "domain";
import CourseModel from "../models/course.model";


//get user by id
export const getUserById = async (id: string, res: Response) => {
    const userJson = await redis.get(id);

    if (userJson) {
        const user = JSON.parse(userJson);
        res.status(201).json({
            success: true,
            user,
        });
    };
}

//Get all users
// export const getAllUsersService = async (res: Response) =>{
//     const users = await userModel.find().sort({createdAt: -1});

//     res.status(201).json({
//         success: true,
//         users,
//     });
// };

// În services/user.service.ts sau unde ai getAllUsersService

export const getAllUsersService = async (reqUser: any, res: Response) => {
    if (reqUser.role === 'admin') {
        const users = await userModel.find().sort({ createdAt: -1 });
        return res.status(200).json({ users });
    }
    
    if (reqUser.role === 'instructor') {
        // 1. Găsește toate cursurile create de instructor
        const instructorCourses = await CourseModel.find({ instructor: reqUser._id });
        
        const courseIds = instructorCourses.map((course: any) => course._id);
        console.log("Cursurile instructorului:", courseIds.map(id => id.toString()));
        
        // Pentru depanare - afișăm și ID-ul instructorului
        console.log("ID instructor:", reqUser._id.toString());
        
        // 2. Găsește utilizatorii înrolați în aceste cursuri - încearcă ambele formate de ID
        const users = await userModel.find({
            $or: [
                { 'courses.courseId': { $in: courseIds } },            // Format ObjectId
                { 'courses.courseId': { $in: courseIds.map(id => id.toString()) } }  // Format string
            ],
        }).sort({ createdAt: -1 });
        
        console.log("Utilizatori găsiți:", users.length);
        
        // Pentru depanare - să vedem cursurile utilizatorilor
        if (users.length === 0) {
            // Verifică dacă există utilizatori înrolați la orice curs
            const allUsers = await userModel.find({ 'courses.courseId': { $exists: true } });
            console.log("Total utilizatori cu cursuri:", allUsers.length);
            
            if (allUsers.length > 0) {
                // Afișează la ce cursuri sunt înrolați utilizatorii
                const enrolledCourseIds = allUsers.flatMap(user => 
                    user.courses?.map((course: any) => 
                        typeof course.courseId === 'object' ? course.courseId.toString() : course.courseId
                    ) || []
                );
                console.log("Cursuri la care sunt înrolați utilizatorii:", [...new Set(enrolledCourseIds)]);
            }
        }
        
        return res.status(200).json({ users });
    }
    
    return res.status(403).json({ message: 'Acces interzis' });
};


//update user role
export const updateUserRoleService = async (res: Response, id: string, role: string) => {
    const user = await userModel.findByIdAndUpdate(id, { role }, { new: true });

    res.status(201).json({
        success: true,
        user,
    });
};