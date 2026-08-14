import express from "express";
import {createOrder,getmyOrders} from "../controllers/orderController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", createOrder);
router.get("/", getmyOrders);

export default router;