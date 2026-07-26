import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import PG from "../models/Pg.js";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, phone, password, pg } = req.body;

    if (
      !name ||
      !email ||
      !phone ||
      !password ||
      !pg ||
      !pg.name ||
      !pg.area ||
      !pg.city ||
      !pg.state
    ) {
      res.status(400).json({
        success: false,
        message: "All required fields are required.",
      });
      return;
    }

    const cleanedName = name.trim();
    const cleanedEmail = email.toLowerCase().trim();
    const cleanedPhone = phone.trim();

    const existingUser = await User.findOne({
      $or: [{ email: cleanedEmail }, { phone: cleanedPhone }],
    });

    if (existingUser) {
      const field =
        existingUser.email === cleanedEmail ? "Email" : "Phone number";

      res.status(409).json({
        success: false,
        message: `${field} already exists.`,
      });
      return;
    }

    const normalizedName = pg.name.toLowerCase().trim();
    const normalizedArea = pg.area.toLowerCase().trim();
    const normalizedCity = pg.city.toLowerCase().trim();

    let existingPg = await PG.findOne({
      normalizedName,
      normalizedArea,
      normalizedCity,
    });

    if (!existingPg) {
      existingPg = await PG.create({
        name: pg.name.trim(),
        normalizedName,

        area: pg.area.trim(),
        normalizedArea,

        city: pg.city.trim(),
        normalizedCity,

        state: pg.state.trim(),
        landmark: pg.landmark?.trim(),
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: cleanedName,
      email: cleanedEmail,
      phone: cleanedPhone,
      password: hashedPassword,
      pg: existingPg._id,
    });

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured.");
    }

    const token = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully.",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        pg: existingPg,
        profilePic: newUser.profilePic ?? null,
        rewardPoints: newUser.rewardPoints,
        averageRating: newUser.averageRating,
        ratingCount: newUser.ratingCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    
    // 1. Receive login data
    const { email, password } = req.body;

    // 2. Validate input
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    // 3. Clean email
    const cleanedEmail = email.toLowerCase().trim();

    // 4. Find user by email
    const existingUser = await User.findOne({
      email: cleanedEmail,
    });

    // 5. Reject if user does not exist
    if (!existingUser) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    // 6. Compare entered password with stored hash
    const isPasswordCorrect = await bcrypt.compare(
      password,
      existingUser.password
    );

    // 7. Reject if password is incorrect
    if (!isPasswordCorrect) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    // 8. Make sure JWT secret exists
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    // 9. Generate token for the existing user
    const token = jwt.sign(
      {
        userId: existingUser._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // 10. Prepare token cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 11. Send successful response
    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      user: {
        id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        phone: existingUser.phone,
        pg: existingUser.pg,
        profilePic: existingUser.profilePic ?? null,
        rewardPoints: existingUser.rewardPoints,
        averageRating: existingUser.averageRating,
        ratingCount: existingUser.ratingCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const me = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id).select("-password");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};