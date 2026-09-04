import type { Request, Response, NextFunction } from "express";
import Campaign, { CampaignRewardType } from "../models/Campaign.js";
import CampaignProgress from "../models/CampaignProgress.js";
import User from "../models/User.js";
import Reward from "../models/Reward.js";
import { RewardType } from "../types/enum.js";

// 1. Get active campaigns with current user's progress
export const getActiveCampaigns = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const now = new Date();

    const activeCampaigns = await Campaign.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ createdAt: -1 });

    // Fetch user progress for each active campaign
    const campaignDataWithProgress = await Promise.all(
      activeCampaigns.map(async (campaign) => {
        let progress = await CampaignProgress.findOne({
          user: userId,
          campaign: campaign._id,
        });

        if (!progress) {
          progress = await CampaignProgress.create({
            user: userId,
            campaign: campaign._id,
            completedDeliveries: 0,
            isClaimed: false,
          });
        }

        const isEligibleToClaim =
          progress.completedDeliveries >= campaign.targetDeliveries && !progress.isClaimed;

        return {
          campaign,
          progress: {
            completedDeliveries: progress.completedDeliveries,
            targetDeliveries: campaign.targetDeliveries,
            percentage: Math.min(
              100,
              Math.round((progress.completedDeliveries / campaign.targetDeliveries) * 100)
            ),
            isClaimed: progress.isClaimed,
            claimedAt: progress.claimedAt,
            rewardCode: progress.rewardCode,
            isEligibleToClaim,
          },
        };
      })
    );

    res.status(200).json({
      success: true,
      message: "Active campaigns fetched successfully",
      data: campaignDataWithProgress,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Claim Campaign Reward
export const claimCampaignReward = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { campaignId } = req.params;

    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
      return;
    }

    const progress = await CampaignProgress.findOne({
      user: userId,
      campaign: campaign._id,
    });

    if (!progress) {
      res.status(404).json({
        success: false,
        message: "No progress found for this campaign",
      });
      return;
    }

    if (progress.isClaimed) {
      res.status(400).json({
        success: false,
        message: "You have already claimed this campaign reward",
        data: {
          rewardCode: progress.rewardCode,
        },
      });
      return;
    }

    if (progress.completedDeliveries < campaign.targetDeliveries) {
      res.status(400).json({
        success: false,
        message: `Milestone not reached. You have completed ${progress.completedDeliveries}/${campaign.targetDeliveries} deliveries.`,
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Process reward based on type
    let rewardCode = campaign.voucherCode;

    if (campaign.rewardType === CampaignRewardType.CASH && campaign.rewardAmount) {
      // Credit wallet
      user.walletBalance = (user.walletBalance || 0) + campaign.rewardAmount;
      await user.save();

      // Log in Reward collection
      await Reward.create({
        user: user._id,
        points: 0,
        type: RewardType.EARNED_TRIP_COMPLETED,
        description: `Cash Milestone Reward: ₹${campaign.rewardAmount} credited to wallet for "${campaign.title}"`,
      });
    }

    progress.isClaimed = true;
    progress.claimedAt = new Date();
    if (rewardCode) {
      progress.rewardCode = rewardCode;
    }
    await progress.save();

    res.status(200).json({
      success: true,
      message: `🎉 Reward claimed successfully!`,
      data: {
        rewardType: campaign.rewardType,
        rewardAmount: campaign.rewardAmount,
        rewardCode: progress.rewardCode,
        voucherDetails: campaign.voucherDetails,
        partnerName: campaign.partnerName,
        walletBalance: user.walletBalance,
      },
    });
  } catch (error) {
    next(error);
  }
};
