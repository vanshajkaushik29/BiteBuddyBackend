import type { Request, Response, NextFunction } from "express";
import User from "../models/User.js";
import Trip from "../models/Trip.js";
import { TripStatus } from "../types/enum.js";

export const createTrip = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      destination,
      departureTime,
      acceptOrdersUntil,
      expectedReturnTime,
      maxOrders,
      carryingFee,
      notes,
    } = req.body;

    // Required field validation
    if (
      !destination ||
      !departureTime ||
      !acceptOrdersUntil ||
      !expectedReturnTime ||
      !maxOrders ||
      carryingFee === undefined
    ) {
      res.status(400).json({
        success: false,
        message: "All required fields are required.",
      });
      return;
    }

    // Convert strings into Date objects
    const departure = new Date(departureTime);
    const acceptUntil = new Date(acceptOrdersUntil);
    const expectedReturn = new Date(expectedReturnTime);

    // Current time
    const now = new Date();

    // Business validations
    if (departure <= now) {
      res.status(422).json({
        success: false,
        message: "Departure time must be in the future.",
      });
      return;
    }

    if (acceptUntil >= departure) {
      res.status(422).json({
        success: false,
        message: "Accept orders time must be before departure time.",
      });
      return;
    }

    if (expectedReturn <= departure) {
      res.status(422).json({
        success: false,
        message: "Expected return time must be after departure time.",
      });
      return;
    }

    if (maxOrders < 1) {
      res.status(422).json({
        success: false,
        message: "Maximum orders must be at least 1.",
      });
      return;
    }

    if (carryingFee < 0) {
      res.status(422).json({
        success: false,
        message: "Carrying fee cannot be negative.",
      });
      return;
    }

    // Get logged-in user
    const user = await User.findById(req.user!.id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    // Check for existing active trip
    const existingTrip = await Trip.findOne({
      createdBy: user._id,
      status: {
        $in: [TripStatus.ACTIVE, TripStatus.STARTED],
      },
    });

    if (existingTrip) {
      res.status(409).json({
        success: false,
        message: "You already have an active trip.",
      });
      return;
    }

    // Create trip
    const trip = await Trip.create({
      createdBy: user._id,
      pg: user.pg,
      destination: destination.trim(),
      departureTime: departure,
      acceptOrdersUntil: acceptUntil,
      expectedReturnTime: expectedReturn,
      maxOrders,
      carryingFee,
      notes,
    });

    res.status(201).json({
      success: true,
      message: "Trip created successfully.",
      data: trip,
    });
  } catch (error) {
    next(error);
  }
};

export const getTrips = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {

    // 1. Find logged-in user
    const user = await User.findById(req.user!.id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // 2. Find active trips of the same PG
    const activeTrips = await Trip.find({
      pg: user.pg,
      status: TripStatus.ACTIVE,
    });

    // 3. Send response
    res.status(200).json({
      success: true,
      message: "Trips fetched successfully",
      data: activeTrips,
    });

  } catch (error) {
    next(error);
  }
};

export const getTripById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tripId = req.params.id;

    const user = await User.findById(req.user!.id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const selectedTrip = await Trip.findById(tripId);

    if (!selectedTrip) {
      res.status(404).json({
        success: false,
        message: "Trip not found",
      });
      return;
    }

    if (selectedTrip.pg.toString() !== user.pg.toString()) {
      res.status(403).json({
        success: false,
        message: "You are not allowed to access this trip.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Trip fetched successfully",
      data: selectedTrip,
    });

  } catch (error) {
    next(error);
  }
};