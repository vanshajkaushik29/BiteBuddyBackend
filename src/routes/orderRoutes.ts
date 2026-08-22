import express from "express";
import {
  createOrder,
  getmyOrders,
  tripOrders,
  getOrderById,
  updateOrder,
  cancelOrder,
  deliverOrder,
  confirmOrder,
} from "../controllers/orderController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", createOrder);

router.get("/", getmyOrders);

router.get("/trip/:tripId", tripOrders);

router.get("/:id", getOrderById);

router.patch("/:id", updateOrder);

router.patch("/:id/cancel", cancelOrder);

router.patch("/:id/deliver", deliverOrder);

router.patch("/:id/confirm", confirmOrder);

export default router;