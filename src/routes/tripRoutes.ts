import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createTrip } from "../controllers/tripController.js";

const router = express.Router();

router.use(protect);

router.post("/",createTrip);

export default router;