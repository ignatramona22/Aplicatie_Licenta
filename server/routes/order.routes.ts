import express from "express";
import { authorizeRoles, isAutheticated } from "../middleware/auth";
import { createOrder, getAllOrders, newPayment, sendStripePublishableKey } from "../controllers/order.controller";
import { updateAccessToken } from "../controllers/user.controllers";

const orderRouter = express.Router();

orderRouter.post('/create-order',updateAccessToken,  isAutheticated, createOrder);

orderRouter.get("/get-all-orders",updateAccessToken, isAutheticated, authorizeRoles("admin", "instructor"),  getAllOrders);

orderRouter.get("/payment/stripepublishablekey", sendStripePublishableKey);

orderRouter.post('/payment', isAutheticated, newPayment);

export default orderRouter;
