import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import OrderModel, { IOrder } from "../models/order.model";
import userModel from "../models/user_model";
import CourseModel, { ICourse } from "../models/course.model";
import path from "path";
import ejs, { name } from "ejs";
import sentMail from "../utils/sendMail";
import NotificationModel from "../models/notification.model";
import { getAllOrdersService, newOrder } from "../services/order.service";
import { redis } from "../utils/redis";
import { request } from "axios";
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
//create order
export const createOrder = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const { courseId, payment_info } = req.body as IOrder;

        if (payment_info) {
            if ("id" in payment_info) {
                const paymentIntentId = payment_info.id;
                const paymentIntent = await stripe.paymentIntents.retrieve(
                    paymentIntentId
                );
                if (paymentIntent.status !== "succeeded") {
                    return next(new ErrorHandler("Plata nu a fost autorizată!", 400));
                }
            }
        }
        const user = await userModel.findById(req.user?._id);

        const courseExistInUser = user?.courses.some((course: any) => course._id.toString() === courseId);

        if (courseExistInUser) {
            return next(new ErrorHandler("Ai achiziționat deja acest curs", 400))
        }

        const course: ICourse | null = await CourseModel.findById(courseId);

        if (!course) {
            return next(new ErrorHandler("Cursul nu a putut fi găsit", 404))
        }

        const data: any = {
            courseId: course._id,
            userId: user?._id,
            payment_info,
        };

        const mailData = {
            order: {
                _id: (course._id as string).toString().slice(0, 6),
                name: course.name,
                price: course.price,
                date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' }),
            }
        }

        const html = await ejs.renderFile(path.join(__dirname, '../mails/order-confirmation.ejs'), { order: mailData });

        try {
            if (user) {
                await sentMail({
                    email: user.email,
                    subject: "Confirmare comandă",
                    template: "order-confirmation.ejs",
                    data: mailData,
                });
            }
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }

        user?.courses.push({ courseId: course?._id as string });

        await redis.set(String(req.user?._id), JSON.stringify(user));

        await user?.save();

        await NotificationModel.create({
            user: user?._id,
            title: "O nouă comandă",
            message: `Ai o nouă comanda de la ${course?.name}`,
        });

        course.purchased = course.purchased += 1;

        await course.save();

        newOrder(data, res, next);

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});

//get all orders - only for admin
// export const getAllOrders = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

//     try {
//         getAllOrdersService(res);
//     } catch (error: any) {
//         return next(new ErrorHandler(error.message, 400))
//     }
// })

export const getAllOrders = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user as any;
        getAllOrdersService(res, user);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

// send stripe publishable key
export const sendStripePublishableKey = CatchAsyncError(async (req: Request, res: Response) => {
    res.status(200).json({
        publishablekey: process.env.STRIPE_PUBLISHABLE_KEY
    });
}
);

// new payment
export const newPayment = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const myPayment = await stripe.paymentIntents.create({
                amount: req.body.amount,
                currency: "RON",
                metadata: {
                    company: "InspireU",
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            res.status(201).json({
                success: true,
                client_secret: myPayment.client_secret,
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);
