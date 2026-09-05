import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/error.js";

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {

  // 1. Agar hamara banaya hua Custom Error hai:
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
    return;
  }


  const message =
    error instanceof Error
      ? error.message
      : "Internal server error";
  res.status(500).json({
    success: false,
    message,
  });
};
