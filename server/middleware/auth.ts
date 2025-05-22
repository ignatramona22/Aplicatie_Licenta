import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "./catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utils/redis";


//authenticated user
export const isAutheticated = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
        const access_token = req.cookies.access_token;
        if(!access_token){
            return next(new ErrorHandler("Te rugăm să te conectezi pentru a putea accesa resursele!",400));
        }

        const decoded = jwt.verify(access_token, process.env.ACCESS_TOKEN as string) as JwtPayload;

        if(!decoded){
            return next(new ErrorHandler("Tokenul de acces nu este valid!",400));
        }

        const user = await redis.get(decoded.id);

        if(!user){
            return next(new ErrorHandler("Te rugăm să te conectezi pentru a putea accesa această resursă!",400));
        }

        req.user = JSON.parse(user);
        next();

});

//validate user role
export const authorizeRoles = (...roles: string[])=>{
    return (req: Request, res: Response, next: NextFunction)=>{
        if(!roles.includes(req.user?.role ||'')){
            return next(new ErrorHandler(`Rolul ${req.user?.role} nu are permisiunea de a accesa această resursă.`, 403));
        }
        next();
    }
}