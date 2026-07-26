import express from "express";
import { register, login,me,logout,updateProfile } from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

//Protected Routes
router.use(protect);
router.get("/me",me);
router.post("/logout",logout);
router.patch("/profile",updateProfile);

export default router;