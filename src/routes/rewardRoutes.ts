import express from "express";
import { getMyRewards } from "../controllers/rewardController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getMyRewards);

export default router;
