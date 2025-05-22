import { NextFunction, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import OrderModel from "../models/order.model";
import CourseModel from "../models/course.model";

//create new order
export const newOrder = CatchAsyncError(async (data: any, res: Response) => {
    const order = await OrderModel.create(data);

    res.status(201).json({
        success: true,
        order,
    });
});

//get all orders
// export const getAllOrdersService = async (res: Response) =>{
//     const orders = await OrderModel.find().sort({createdAt: -1});

//     res.status(201).json({
//         success: true,
//         orders,
//     });
// };

export const getAllOrdersService = async (res: Response, reqUser: any) => {
    // Dacă utilizatorul este admin, returnează toate comenzile
    if (reqUser.role === 'admin') {
        const orders = await OrderModel.find().sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            orders,
        });
    }

    // Dacă utilizatorul este instructor, returnează doar comenzile pentru cursurile lui
    if (reqUser.role === 'instructor') {
        // 1. Găsește toate cursurile create de instructor
        const instructorCourses = await CourseModel.find({ instructor: reqUser._id });
        
        // Obține ID-urile cursurilor instructorului
        const courseIds = instructorCourses.map((course: any) => course._id.toString());
        
        console.log("Cursurile instructorului:", courseIds);
        
        // 2. Găsește comenzile pentru aceste cursuri
        const orders = await OrderModel.find({
            courseId: { $in: courseIds }
        }).sort({ createdAt: -1 });
        
        console.log("Comenzi găsite:", orders.length);
        
        return res.status(200).json({
            success: true,
            orders,
        });
    }
    
    // Pentru orice alt rol, acces interzis
    return res.status(403).json({ 
        success: false,
        message: 'Acces interzis'
    });
};