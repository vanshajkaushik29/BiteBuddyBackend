import type { Request, Response, NextFunction } from "express";
import User from "../models/User.js";
import Reward from "../models/Reward.js";

export const getMyRewards = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    // 1. Find logged-in user
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // 2. Fetch all reward transactions for this user sorted by newest first
    const rewards = await Reward.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("order", "food price totalPrice status");

    // 3. Send response with current total reward points and reward history
    res.status(200).json({
      success: true,
      message: "Rewards fetched successfully",
      data: {
        rewardPoints: user.rewardPoints,
        history: rewards,
      },
    });
  } catch (error) {
    next(error);
  }
};
