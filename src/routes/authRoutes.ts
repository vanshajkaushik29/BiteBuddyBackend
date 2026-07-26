import express from "express";
import { register, login,me } from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

//Protected Routes
router.use(protect);
router.get("/me",me);

export default router;