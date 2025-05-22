import express from "express";
import { activateUser, getUserInfo, loginUser, logoutUser, registrationUser, socialAuth, updateAccessToken, updateUserInfo, updatePassword , updateProfilePicture, getAllUsers, updateUserRole, deleteUser} from "../controllers/user.controllers";
import { isAutheticated, authorizeRoles } from "../middleware/auth";
const userRouter = express.Router();

userRouter.post('/registration', registrationUser);

userRouter.post('/activate-user', activateUser);

userRouter.post('/login', loginUser);

userRouter.get('/logout', isAutheticated, logoutUser);

userRouter.get('/refreshtoken', updateAccessToken);

userRouter.get('/me', updateAccessToken, isAutheticated, getUserInfo);

userRouter.post("/social-auth", socialAuth);

userRouter.put("/update-user-info", updateAccessToken, isAutheticated, updateUserInfo);

userRouter.put("/update-user-password",updateAccessToken, isAutheticated, updatePassword);

userRouter.put("/update-user-avatar",updateAccessToken, isAutheticated, updateProfilePicture);

userRouter.get("/get-all-users",updateAccessToken, isAutheticated, authorizeRoles("admin", "instructor"),  getAllUsers);

userRouter.put("/update-user-role",updateAccessToken, isAutheticated,   updateUserRole);


userRouter.delete("/delete-user/:id",updateAccessToken, isAutheticated, authorizeRoles("admin"),  deleteUser);
export default userRouter;