import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  getActiveCampaigns,
  claimCampaignReward,
} from "../controllers/campaignController.js";

const router = express.Router();

// User endpoints for active monthly campaigns and claiming rewards
router.get("/active", protect, getActiveCampaigns);
router.post("/:campaignId/claim", protect, claimCampaignReward);

export default router;
