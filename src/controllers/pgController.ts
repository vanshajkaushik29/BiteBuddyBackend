import type { Request, Response, NextFunction } from "express";
import User from "../models/User.js";
import PG from "../models/Pg.js";

export const getPGs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Get logged-in user
    const user = await User.findById(req.user!.id).populate("pg");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 2. Check whether user has a PG
    if (!user.pg) {
      return res.status(404).json({
        success: false,
        message: "User is not associated with any PG",
      });
    }

    // 3. Get user's PG
    const userPG = user.pg as any;

    // 4. Find PGs in the same area, city and state
    const pgs = await PG.find({
      normalizedArea: userPG.normalizedArea,
      normalizedCity: userPG.normalizedCity,
      state: userPG.state,
    });

    return res.status(200).json({
      success: true,
      message: "PGs fetched successfully",
      data: pgs,
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