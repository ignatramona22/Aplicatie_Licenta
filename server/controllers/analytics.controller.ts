import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import { generateFilteredLast12MonthsData, generateLast12MonthsData } from "../utils/analytics.generator";
import userModel from "../models/user_model";
import CourseModel from "../models/course.model";
import OrderModel from "../models/order.model";

const getInstructorCourseIds = async (instructorId: string) => {
    const courses = await CourseModel.find({ instructor: instructorId });
    return courses.map((course: any) => course._id.toString());
};

// Funcție auxiliară pentru a obține ID-urile utilizatorilor înrolați la cursurile unui instructor
const getUsersEnrolledInInstructorCourses = async (instructorId: string) => {
    const courseIds = await getInstructorCourseIds(instructorId);
    
    const users = await userModel.find({
        'courses.courseId': { $in: courseIds }
    });
    
    return users.map((user: any) => user._id.toString());
};


//get users analytics --only for admin 
// export const getUsersAnalytics = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

//     try {
//         const users = await generateLast12MonthsData(userModel);

//         res.status(200).json({
//             success: true,
//             users,
//         })
//     } catch (error: any) {
//         return next(new ErrorHandler(error.message, 400))
//     }
// })



//get courses analytics --only for admin 
// export const getCoursesAnalytics = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

//     try {
//         const courses = await generateLast12MonthsData(CourseModel);

//         res.status(200).json({
//             success: true,
//             courses,
//         })
//     } catch (error: any) {
//         return next(new ErrorHandler(error.message, 400))
//     }
// })

export const getUsersAnalytics = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const reqUser = req.user as any;
        
        if (reqUser.role === 'admin') {
            // Admin vede toate datele
            const users = await generateLast12MonthsData(userModel);
            return res.status(200).json({
                success: true,
                users,
            });
        } else if (reqUser.role === 'instructor') {
            // Instructor vede doar utilizatorii înrolați la cursurile sale
            const enrolledUserIds = await getUsersEnrolledInInstructorCourses(reqUser._id.toString());
            
            // Generăm date analitice doar pentru utilizatorii filtrați
            const users = await generateFilteredLast12MonthsData(
                userModel,
                { _id: { $in: enrolledUserIds } }
            );
            
            return res.status(200).json({
                success: true,
                users,
            });
        } else {
            return res.status(403).json({
                success: false,
                message: "Acces interzis",
            });
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

export const getCoursesAnalytics = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const reqUser = req.user as any;
        
        if (reqUser.role === 'admin') {
            // Admin vede toate datele
            const courses = await generateLast12MonthsData(CourseModel);
            return res.status(200).json({
                success: true,
                courses,
            });
        } else if (reqUser.role === 'instructor') {
            // Instructor vede doar cursurile proprii
            const courses = await generateFilteredLast12MonthsData(
                CourseModel,
                { instructor: reqUser._id }
            );
            
            return res.status(200).json({
                success: true,
                courses,
            });
        } else {
            return res.status(403).json({
                success: false,
                message: "Acces interzis",
            });
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

//get order analytics --only for admin 
// export const getOrderAnalytics = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

//     try {
//         const orders = await generateLast12MonthsData(OrderModel);

//         res.status(200).json({
//             success: true,
//             orders,
//         })
//     } catch (error: any) {
//         return next(new ErrorHandler(error.message, 400))
//     }
// })

export const getOrderAnalytics = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const reqUser = req.user as any;
        
        if (reqUser.role === 'admin') {
            // Admin vede toate datele
            const orders = await generateLast12MonthsData(OrderModel);
            return res.status(200).json({
                success: true,
                orders,
            });
        } else if (reqUser.role === 'instructor') {
            // Instructor vede doar comenzile pentru cursurile proprii
            const courseIds = await getInstructorCourseIds(reqUser._id.toString());
            
            const orders = await generateFilteredLast12MonthsData(
                OrderModel,
                { courseId: { $in: courseIds } }
            );
            
            return res.status(200).json({
                success: true,
                orders,
            });
        } else {
            return res.status(403).json({
                success: false,
                message: "Acces interzis",
            });
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});