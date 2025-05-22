import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import clodinary from "cloudinary";
import { createCourse, getAllCoursesService } from "../services/course.service";
import CourseModel from "../models/course.model";
import { redis } from "../utils/redis";
import { couldStartTrivia } from "typescript";
import mongoose from "mongoose";
import ejs from 'ejs';
import path from "path";
import sendMail from "../utils/sendMail";
import { title } from "process";
import NotificationModel from "../models/notification.model";
import axios from "axios";

//upload course

// export const uploadCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

//     try {
//         const data = req.body;
//         const thumbnail = data.thumbnail;

//         if (!thumbnail) {
//             const myCloud = await clodinary.v2.uploader.upload(thumbnail, {
//                 folder: "course"
//             });

//             data.thumbnail = {
//                 public_id: myCloud.public_id,
//                 url: myCloud.secure_url
//             }
//         }

//         createCourse(data, res, next);

//     } catch (error: any) {
//         return next(new ErrorHandler(error.message, 500))
//     }
// })

export const uploadCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;

        // Adăugăm ID-ul utilizatorului autentificat ca instructor
        data.instructor = req.user?._id;

        if (!thumbnail) {
            const myCloud = await clodinary.v2.uploader.upload(thumbnail, {
                folder: "course"
            });

            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            }
        }

        createCourse(data, res, next);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
})

//edit course

export const editCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;
        const courseId = req.params.id;

        const courseData = await CourseModel.findById(courseId) as any;

        if (!courseData) {
            return next(new ErrorHandler("Cursul nu a fost găsit", 404));
        }

        // Verificăm dacă thumbnail este un string sau un obiect
        if (thumbnail && typeof thumbnail === 'string') {
            // Este un string nou, trebuie să încărcăm o imagine nouă
            if (!thumbnail.startsWith("https")) {
                // Ștergem imaginea veche dacă există
                if (courseData.thumbnail && courseData.thumbnail.public_id) {
                    await clodinary.v2.uploader.destroy(courseData.thumbnail.public_id);
                }

                // Încărcăm imaginea nouă
                const myCloud = await clodinary.v2.uploader.upload(thumbnail, {
                    folder: "course",
                });

                data.thumbnail = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url,
                };
            } else {
                // Este un URL existent, păstrăm datele vechi
                data.thumbnail = {
                    public_id: courseData?.thumbnail?.public_id || "",
                    url: courseData?.thumbnail?.url || "",
                };
            }
        } else if (thumbnail && typeof thumbnail === 'object') {
            // Este deja un obiect, păstrăm structura
            // Nu facem nimic, păstrăm obiectul așa cum este
        } else {
            // Nu s-a furnizat thumbnail, păstrăm datele vechi
            data.thumbnail = courseData.thumbnail;
        }

        const course = await CourseModel.findByIdAndUpdate(
            courseId,
            { $set: data },
            { new: true }
        );

        res.status(201).json({
            success: true,
            course,
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

//get single course - without purchasing

export const getSingleCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

    try {

        const courseId = req.params.id;

        const isCacheExist = await redis.get(courseId);

        if (isCacheExist) {
            const course = JSON.parse(isCacheExist);
            res.status(200).json({
                success: true,
                course,
            });
        } else {
            const course = await CourseModel.findById(req.params.id).select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");

            await redis.set(courseId, JSON.stringify(course), 'EX', 604800); //7 zile

            res.status(200).json({
                success: true,
                course,
            });

        }

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});


//get all courses - without purchasing

export const getAllCourses = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

    try {
        const courses = await CourseModel.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");


        res.status(200).json({
            success: true,
            courses,
        })


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});


//get course content - only for valid user

export const getCourseByUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userCourseList = req.user?.courses;
        const courseId = req.params.id;

    
        const courseExist = userCourseList?.find((course: any) => course.courseId.toString() === courseId);

        if (!courseExist) {
            return next(new ErrorHandler("Ne pare rău, dar nu ești eligibil pentru a accesa acest curs!", 404));
        }

        const course = await CourseModel.findById(courseId);
        const content = course?.courseData;

        res.status(200).json({
            success: true,
            content,
        });


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});

//add questons in course
interface IAddQuestionData {
    question: string;
    courseId: string;
    contentId: string;
}

export const addQuestion = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { question, courseId, contentId }: IAddQuestionData = req.body;
        const course = await CourseModel.findById(courseId);

        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler("Id content invalid", 400))
        }

        const courseContent = course?.courseData?.find((item: any) => item._id.equals(contentId));

        if (!courseContent) {
            return next(new ErrorHandler("Id content invalidd", 400))
        }

        //create a new question object
        const newQuestion: any = {
            user: req.user,
            question,
            questionReplies: [],
        };

        //add this question to our course content
        courseContent.questions.push(newQuestion);

        await NotificationModel.create({
            user: req.user?._id,
            title: "Ai primit o întrebare nouă!",
            message: `A fost adăugată o întrebare nouă în ${courseContent.title}.`,
        });

        //save the updated course
        await course?.save();

        res.status(200).json({
            success: true,
            course,
        });


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});

//add answer in course question

interface IAddAnswerData {
    answer: string;
    courseId: string;
    contentId: string;
    questionId: string;
}

export const addAnswer = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { answer, courseId, contentId, questionId }: IAddAnswerData = req.body;

        const course = await CourseModel.findById(courseId);

        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler("Id content invalid", 400))
        }

        const courseContent = course?.courseData?.find((item: any) => item._id.equals(contentId));

        if (!courseContent) {
            return next(new ErrorHandler("Id content invalid", 400))
        }

        const question = courseContent?.questions?.find((item: any) =>
            item._id.equals(questionId)
        );


        if (!question) {
            return next(new ErrorHandler("Id întrebare invalid", 400))
        }

        //create a new answer object
        const newAnswer: any = {
            user: req.user,
            answer,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }

        //add this answer to our course content
        question.questionReplies?.push(newAnswer);

        await course?.save();

        if (req.user?._id === question.user._id) {
            //create a notification

            await NotificationModel.create({
                user: req.user?._id,
                title: "Ai primit un răspuns nou!",
                message: `Cineva a răspuns la întrebarea ta din ${courseContent.title}.`
            });

        } else {
            const data = {
                name: question.user.name,
                title: courseContent.title,
            }

            const html = await ejs.renderFile(path.join(__dirname, "../mails/question-reply.ejs"), data);
            try {
                await sendMail({
                    email: question.user.email,
                    subject: "Răspunsul întrebării tale...",
                    template: "question-reply.ejs",
                    data,
                });

            } catch (error: any) {
                return next(new ErrorHandler(error.message, 500))
            }
        }

        res.status(200).json({
            success: true,
            course,
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});

//add review in course
interface IAddReviewData {
    review: string;
    rating: number;
    userId: string;
}

export const addReview = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const userCourseList = req.user?.courses;

        const courseId = req.params.id;


        //check if courseId already exists in userVourseList based on _id
        const courseExists = userCourseList?.some((course: any) => {
            return course.courseId?.toString() === courseId.toString();
        });
        
        if (!courseExists) {
            return next(new ErrorHandler("Ne pare rău, dar nu ești eligibil pentru a accesa acest curs!", 404));
        }

        const course = await CourseModel.findById(courseId);

        const { review, rating } = req.body as IAddReviewData;

        const reviewData: any = {
            user: req.user,
            comment: review,
            rating,
        }

        course?.reviws.push(reviewData);

        let avg = 0;

        course?.reviws.forEach((rev: any) => {
            avg += rev.rating;
        });

        if (course) {
            course.ratings = avg / course.reviws.length;
        }

        await course?.save();
        await redis.set(courseId, JSON.stringify(course), "EX", 604800); //7zile

        // const notificatin = {
        //     title: "O nouă recenzie a fost adăugată!",
        //     message: `${req.user?.name} a oferit o recenzie cursului ${course?.name}!`,
        // }

        //create notification
        await NotificationModel.create({
            user: req.user?._id,
            title: "O nouă recenzie a fost adăugată!",
            message: `${req.user?.name} a oferit o recenzie cursului ${course?.name}!`,
        });
        res.status(200).json({
            success: true,
            course,
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});

//add reply in review
interface IAddReviewData {
    comment: string;
    courseId: string;
    reviewId: string;
}
export const addReplyToReview = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const { comment, courseId, reviewId } = req.body as IAddReviewData;

        const course = await CourseModel.findById(courseId);

        if (!course) {
            return next(new ErrorHandler("Cursul nu a putut fi găsit!", 404));
        }

        const review = course?.reviws?.find((rev: any) => rev._id.toString() === reviewId);

        if (!review) {
            return next(new ErrorHandler("Recenzia nu a putut fi găsită!", 404));
        }

        const replyData: any = {
            user: req.user,
            comment,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        if (!review.commentReplies) {
            review.commentReplies = [];
        }
        review.commentReplies?.push(replyData);

        await course?.save();
        await redis.set(courseId, JSON.stringify(course), "EX", 604800); //7zile


        res.status(200).json({
            success: true,
            course,
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});

//get all courses - only for admin
export const getAllCoursesAdmin = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

    try {
        getAllCoursesService(res);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

export const getAllCoursesInsructor = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const instructorId = req.user?._id ?? ""; // presupune că ai middleware de autentificare care setează req.user
    const courses = await CourseModel.find({ instructor: instructorId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, courses });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
});



//delete Course - only for admin
export const deleteCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

    try {
        const { id } = req.params;

        const course = await CourseModel.findById(id);

        if (!course) {
            return next(new ErrorHandler("Cursul nu a fost găsit", 404));
        }

        await course.deleteOne({ id });

        await redis.del(id);

        res.status(200).json({
            success: true,
            message: "Cursul a fost șters cu success!",
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})


// generate video URL
export const generateVideoUrl = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { videoId } = req.body;
            const response = await axios.post(
                `https://dev.vdocipher.com/api/videos/${videoId}/otp`,
                { ttl: 300 },
                {
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        Authorization: `Apisecret ${process.env.VDOCIPHER_API_SECRET}`,
                    },
                }
            );

            res.json(response.data);
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400));
        }
    }
);
