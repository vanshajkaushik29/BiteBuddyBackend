import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  getPGs,
  getPGById,
} from "../controllers/pgController.js";

const router = express.Router();

router.use(protect);

router.get("/", getPGs);

router.get("/:id", getPGById);

export default router;