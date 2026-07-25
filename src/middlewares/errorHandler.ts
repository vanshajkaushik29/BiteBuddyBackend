import type { Request, Response, NextFunction } from "express";

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  
  const statusCode = 500;
  const message =
  error instanceof Error
    ? error.message
    : "Internal server error";
    res.status(statusCode).json({
  success: false,
  message,
});
};
