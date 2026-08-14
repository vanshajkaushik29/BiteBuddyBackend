import express from "express";
import {createOrder,getmyOrders,tripOrders,getOrderById,updateOrder,cancelOrder} from "../controllers/orderController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);


router.post("/", createOrder);

router.get("/", getmyOrders);

router.get("/trip/:tripId", tripOrders);

router.get("/:id", getOrderById);

router.patch("/:id", updateOrder);

router.patch("/:id/cancel", cancelOrder);

export default router;