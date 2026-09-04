import type { Request, Response, NextFunction } from "express";
import User from "../models/User.js";
import PG from "../models/Pg.js";
import { parsePaginationParams, createPaginationMeta } from "../utils/pagination.js";

export const getPGs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Guard Clause: Parse & Validate pagination parameters from URL
    const { params, error } = parsePaginationParams(req.query.page, req.query.limit, 20);
    if (error) {
      res.status(400).json({
        success: false,
        message: error,
      });
      return;
    }
    const { page, limit, skip } = params!;

    // 2. Get logged-in user
    const user = await User.findById(req.user!.id).populate("pg");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // 3. Check whether user has a PG
    if (!user.pg) {
      res.status(404).json({
        success: false,
        message: "User is not associated with any PG",
      });
      return;
    }

    // 4. Get user's PG
    const userPG = user.pg as any;
    const filter = {
      normalizedArea: userPG.normalizedArea,
      normalizedCity: userPG.normalizedCity,
      state: userPG.state,
    };

    // 5. Concurrent DB Queries: Fetch paginated PGs + Total count
    const [pgs, total] = await Promise.all([
      PG.find(filter)
        .sort({ name: 1, _id: 1 })
        .skip(skip)
        .limit(limit),
      PG.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: "PGs fetched successfully",
      data: pgs,
      pagination: createPaginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};


export const getPGById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const pgId = req.params.id;

    const pg = await PG.findById(pgId);

    if (!pg) {
      return res.status(404).json({
        success: false,
        message: "PG not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "PG fetched successfully",
      data: pg,
    });
  } catch (error) {
    next(error);
  }
};