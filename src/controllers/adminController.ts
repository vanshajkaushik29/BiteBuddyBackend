import type { Request, Response, NextFunction } from "express";
import Order from "../models/Order.js";
import Trip from "../models/Trip.js";
import User from "../models/User.js";
import Reward from "../models/Reward.js";
import Campaign, { CampaignRewardType } from "../models/Campaign.js";
import CampaignProgress from "../models/CampaignProgress.js";
import SystemConfig from "../models/SystemConfig.js";
import { OrderStatus, TripStatus } from "../types/enum.js";
import { parsePaginationParams, createPaginationMeta } from "../utils/pagination.js";

// Helper to get active platform fee config
export const getActivePlatformFee = async (): Promise<number> => {
  const config = await SystemConfig.findOne({ key: "PLATFORM_FEE" });
  if (config && typeof config.value === "number") {
    return config.value;
  }
  return 4; // Default fallback
};

// 1. Analytics & Profit Dashboard
export const getAdminAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalUsers,
      totalTrips,
      activeTrips,
      totalOrders,
      completedOrders,
      ordersAgg,
      activeCampaignsCount,
      claimedCampaigns,
      platformFeeConfig,
    ] = await Promise.all([
      User.countDocuments(),
      Trip.countDocuments(),
      Trip.countDocuments({ status: { $in: [TripStatus.ACTIVE, TripStatus.STARTED] } }),
      Order.countDocuments(),
      Order.countDocuments({ status: OrderStatus.COMPLETED }),
      Order.aggregate([
        { $match: { status: OrderStatus.COMPLETED } },
        {
          $group: {
            _id: null,
            totalFoodSales: { $sum: { $multiply: ["$price", "$quantity"] } },
            totalCarryingFees: { $sum: "$carryingFee" },
            totalPlatformFees: { $sum: { $ifNull: ["$platformFee", 4] } },
            totalGrossVolume: { $sum: "$totalPrice" },
          },
        },
      ]),
      Campaign.countDocuments({ isActive: true }),
      CampaignProgress.find({ isClaimed: true }).populate("campaign"),
      SystemConfig.findOne({ key: "PLATFORM_FEE" }),
    ]);

    const stats = ordersAgg[0] || {
      totalFoodSales: 0,
      totalCarryingFees: 0,
      totalPlatformFees: 0,
      totalGrossVolume: 0,
    };

    // Calculate total rewards distributed
    let totalCashRewardsPaid = 0;
    claimedCampaigns.forEach((progress) => {
      const camp = progress.campaign as any;
      if (camp && camp.rewardType === CampaignRewardType.CASH && camp.rewardAmount) {
        totalCashRewardsPaid += camp.rewardAmount;
      }
    });

    const netPlatformProfit = stats.totalPlatformFees - totalCashRewardsPaid;

    res.status(200).json({
      success: true,
      message: "Admin analytics fetched successfully",
      data: {
        totalUsers,
        totalTrips,
        activeTrips,
        totalOrders,
        completedOrders,
        totalFoodSales: stats.totalFoodSales,
        totalCarryingFeesEarnedByStudents: stats.totalCarryingFees,
        totalPlatformFeesCollected: stats.totalPlatformFees,
        totalGrossVolume: stats.totalGrossVolume,
        totalCashRewardsPaid,
        netPlatformProfit,
        activeCampaignsCount,
        currentPlatformFee: platformFeeConfig?.value ?? 4,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. System Settings (Platform Fee config)
export const getSystemSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let platformFeeConfig = await SystemConfig.findOne({ key: "PLATFORM_FEE" });
    if (!platformFeeConfig) {
      platformFeeConfig = await SystemConfig.create({
        key: "PLATFORM_FEE",
        value: 4,
        description: "BiteBuddy Platform Convenience Fee per order in ₹",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        platformFee: platformFeeConfig.value,
        description: platformFeeConfig.description,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateSystemSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { platformFee } = req.body;

    if (platformFee === undefined || typeof platformFee !== "number" || platformFee < 0) {
      res.status(400).json({
        success: false,
        message: "Valid platformFee number (>= 0) is required",
      });
      return;
    }

    const config = await SystemConfig.findOneAndUpdate(
      { key: "PLATFORM_FEE" },
      { value: platformFee, description: "BiteBuddy Platform Convenience Fee per order in ₹" },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: `Platform fee updated to ₹${platformFee} successfully`,
      data: {
        platformFee: config.value,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 3. Campaign CRUD
export const getAllCampaigns = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Campaigns fetched successfully",
      data: campaigns,
    });
  } catch (error) {
    next(error);
  }
};

export const createCampaign = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      title,
      description,
      badgeText,
      rewardType,
      targetDeliveries,
      rewardAmount,
      voucherCode,
      voucherDetails,
      partnerName,
      partnerLogo,
      startDate,
      endDate,
      isActive,
      minOrderValue,
    } = req.body;

    if (!title || !description || !endDate || !targetDeliveries) {
      res.status(400).json({
        success: false,
        message: "Title, description, targetDeliveries, and endDate are required",
      });
      return;
    }

    const campaign = await Campaign.create({
      title: title.trim(),
      description: description.trim(),
      badgeText: badgeText ? badgeText.trim() : "Monthly Quest",
      rewardType: rewardType || CampaignRewardType.CASH,
      targetDeliveries: Number(targetDeliveries),
      rewardAmount: Number(rewardAmount) || 0,
      voucherCode: voucherCode?.trim(),
      voucherDetails: voucherDetails?.trim(),
      partnerName: partnerName?.trim(),
      partnerLogo: partnerLogo?.trim(),
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: new Date(endDate),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      minOrderValue: Number(minOrderValue) || 0,
    });

    res.status(201).json({
      success: true,
      message: "Campaign created successfully",
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCampaign = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const campaign = await Campaign.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!campaign) {
      res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Campaign updated successfully",
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCampaign = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findByIdAndDelete(id);

    if (!campaign) {
      res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
      return;
    }

    // Also clean up campaign progress records
    await CampaignProgress.deleteMany({ campaign: id as any });

    res.status(200).json({
      success: true,
      message: "Campaign and associated progress records deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const toggleCampaignStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findById(id);

    if (!campaign) {
      res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
      return;
    }

    campaign.isActive = !campaign.isActive;
    await campaign.save();

    res.status(200).json({
      success: true,
      message: `Campaign is now ${campaign.isActive ? "Active" : "Inactive"}`,
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
};

// 4. User Admin Management
export const listUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Guard Clause: Parse & Validate pagination parameters
    const { params, error } = parsePaginationParams(req.query.page, req.query.limit, 20);
    if (error) {
      res.status(400).json({
        success: false,
        message: error,
      });
      return;
    }
    const { page, limit, skip } = params!;

    // 2. Concurrent DB Queries: Fetch paginated users + Total count
    const [users, total] = await Promise.all([
      User.find()
        .select("-password")
        .populate("pg", "name area city")
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(),
    ]);

    // 3. Return response with standard pagination envelope
    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: users,
      pagination: createPaginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

export const setUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !["user", "admin"].includes(role)) {
      res.status(400).json({
        success: false,
        message: "Valid role ('user' or 'admin') is required",
      });
      return;
    }

    const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select("-password");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
