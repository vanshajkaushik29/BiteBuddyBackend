import type { Request, Response, NextFunction } from "express";
import User from "../models/User.js";
import Reward from "../models/Reward.js";
import { parsePaginationParams, createPaginationMeta } from "../utils/pagination.js";

export const getMyRewards = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Guard Clause: Parse & Validate pagination parameters from URL
    const { params, error } = parsePaginationParams(req.query.page, req.query.limit, 15);
    if (error) {
      res.status(400).json({
        success: false,
        message: error,
      });
      return;
    }
    const { page, limit, skip } = params!;

    const userId = req.user!.id;

    // 2. Find logged-in user
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const filter = { user: userId };

    // 3. Concurrent DB Queries: Fetch paginated reward transactions + Total count
    const [rewards, total] = await Promise.all([
      Reward.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate("order", "food price totalPrice status"),
      Reward.countDocuments(filter),
    ]);

    // 4. Send response with pagination metadata envelope
    res.status(200).json({
      success: true,
      message: "Rewards fetched successfully",
      data: {
        rewardPoints: user.rewardPoints,
        history: rewards,
      },
      pagination: createPaginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

