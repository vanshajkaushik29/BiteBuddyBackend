import express from "express";
import { protect, requireAdmin } from "../middlewares/authMiddleware.js";
import {
  getAdminAnalytics,
  getSystemSettings,
  updateSystemSettings,
  getAllCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  toggleCampaignStatus,
  listUsers,
  setUserRole,
} from "../controllers/adminController.js";

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect, requireAdmin);

// Analytics
router.get("/analytics", getAdminAnalytics);

// System Settings (Platform fee config)
router.get("/settings", getSystemSettings);
router.patch("/settings", updateSystemSettings);

// Campaign CRUD
router.get("/campaigns", getAllCampaigns);
router.post("/campaigns", createCampaign);
router.patch("/campaigns/:id", updateCampaign);
router.delete("/campaigns/:id", deleteCampaign);
router.patch("/campaigns/:id/toggle", toggleCampaignStatus);

// User role management
router.get("/users", listUsers);
router.patch("/users/:id/role", setUserRole);

export default router;
