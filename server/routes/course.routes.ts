import express from "express";
import { addAnswer, addQuestion, addReplyToReview, addReview, deleteCourse, editCourse, generateVideoUrl, getAllCourses, getAllCoursesAdmin, getAllCoursesInsructor, getCourseByUser, getSingleCourse, uploadCourse } from "../controllers/course.controller";
import { authorizeRoles, isAutheticated } from "../middleware/auth";
import { updateAccessToken } from "../controllers/user.controllers";
const courseRouter = express.Router();

courseRouter.post("/create-course", updateAccessToken, isAutheticated, authorizeRoles("admin", "instructor"), uploadCourse);

courseRouter.put("/edit-course/:id", updateAccessToken, isAutheticated, authorizeRoles("admin", "instructor"), editCourse);

courseRouter.get("/get-course/:id", getSingleCourse);

courseRouter.get("/get-courses", getAllCourses);

courseRouter.get("/get-all-courses", updateAccessToken, isAutheticated, authorizeRoles("admin"), getAllCoursesAdmin);

courseRouter.get("/get-all-courses-instructor", updateAccessToken, isAutheticated, authorizeRoles("instructor"), getAllCoursesInsructor);

courseRouter.get("/get-course-content/:id", updateAccessToken, isAutheticated, getCourseByUser);


courseRouter.put("/add-question", updateAccessToken, isAutheticated, addQuestion);

courseRouter.put("/add-answer", updateAccessToken, isAutheticated, addAnswer);

courseRouter.put("/add-review/:id", updateAccessToken, isAutheticated, addReview);

courseRouter.put("/add-reply", updateAccessToken, isAutheticated, authorizeRoles("admin", "instructor"), addReplyToReview);

courseRouter.post(
  "/getVdoCipherOTP",
  generateVideoUrl
);


courseRouter.delete("/delete-course/:id", updateAccessToken, isAutheticated, authorizeRoles("admin", "instructor"), deleteCourse);

export default courseRouter;

