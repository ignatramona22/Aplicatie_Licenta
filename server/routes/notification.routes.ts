import express from "express";
import { authorizeRoles, isAutheticated } from "../middleware/auth";
import { getNotifications, updateNotification } from "../controllers/notifications.controller";
import { updateAccessToken } from "../controllers/user.controllers";

const notificationRoute = express.Router();

notificationRoute.get("/get-all-notifications", updateAccessToken, isAutheticated, authorizeRoles("admin", "instructor"), getNotifications);

notificationRoute.put("/update-notification/:id",updateAccessToken,  isAutheticated, authorizeRoles("admin", "instructor"), updateNotification);
export default notificationRoute;