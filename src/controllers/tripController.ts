import type { Request, Response, NextFunction } from "express";
import User from "../models/User.js";
import Trip from "../models/Trip.js";
import { TripStatus } from "../types/enum.js";
import { updateTripStatus } from "../utils/updateTripStatus.js";

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

    //update the status of active trips if they have started
    for (const trip of activeTrips) {
      await updateTripStatus(trip);
    }

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

export const updateTrip = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tripId = req.params.id;

    const {
      destination,
      departureTime,
      acceptOrdersUntil,
      expectedReturnTime,
      maxOrders,
      carryingFee,
      notes,
    } = req.body;

    // Find logged-in user
    const user = await User.findById(req.user!.id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Find trip
    const trip = await Trip.findById(tripId);

    if (!trip) {
      res.status(404).json({
        success: false,
        message: "Trip not found",
      });
      return;
    }

    // Only creator can update
    if (trip.createdBy.toString() !== user._id.toString()) {
      res.status(403).json({
        success: false,
        message: "You are not allowed to update this trip",
      });
      return;
    }

    // Completed or Cancelled trips cannot be updated
    if (
      trip.status === TripStatus.COMPLETED ||
      trip.status === TripStatus.CANCELLED
    ) {
      res.status(400).json({
        success: false,
        message: "This trip cannot be updated",
      });
      return;
    }

    // Trip already started
    if (new Date() >= trip.departureTime) {
      res.status(400).json({
        success: false,
        message: "Trip has already started",
      });
      return;
    }

    // Prepare latest values
    const finalDepartureTime = departureTime
      ? new Date(departureTime)
      : trip.departureTime;

    const finalAcceptOrdersUntil = acceptOrdersUntil
      ? new Date(acceptOrdersUntil)
      : trip.acceptOrdersUntil;

    const finalExpectedReturnTime = expectedReturnTime
      ? new Date(expectedReturnTime)
      : trip.expectedReturnTime;

    // Validate time rules
    if (finalDepartureTime <= new Date()) {
      res.status(400).json({
        success: false,
        message: "Departure time must be in the future",
      });
      return;
    }

    if (finalAcceptOrdersUntil >= finalDepartureTime) {
      res.status(400).json({
        success: false,
        message: "Accept orders time must be before departure time",
      });
      return;
    }

    if (finalExpectedReturnTime <= finalDepartureTime) {
      res.status(400).json({
        success: false,
        message: "Expected return time must be after departure time",
      });
      return;
    }

    // Validate max orders
    if (maxOrders !== undefined) {
      if (maxOrders < trip.currentOrders) {
        res.status(400).json({
          success: false,
          message: "Max orders cannot be less than current orders",
        });
        return;
      }

      trip.maxOrders = maxOrders;
    }

    // Validate carrying fee
    if (carryingFee !== undefined) {
      if (carryingFee < 0) {
        res.status(400).json({
          success: false,
          message: "Carrying fee cannot be negative",
        });
        return;
      }

      trip.carryingFee = carryingFee;
    }

    // Update remaining fields
    if (destination !== undefined) {
      trip.destination = destination.trim();
    }

    if (departureTime !== undefined) {
      trip.departureTime = finalDepartureTime;
    }

    if (acceptOrdersUntil !== undefined) {
      trip.acceptOrdersUntil = finalAcceptOrdersUntil;
    }

    if (expectedReturnTime !== undefined) {
      trip.expectedReturnTime = finalExpectedReturnTime;
    }

    if (notes !== undefined) {
      trip.notes = notes.trim();
    }

    await trip.save();

    res.status(200).json({
      success: true,
      message: "Trip updated successfully",
      data: trip,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTrip = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tripId = req.params.id;

    // Find logged-in user
    const user = await User.findById(req.user!.id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Find trip
    const trip = await Trip.findById(tripId);

    if (!trip) {
      res.status(404).json({
        success: false,
        message: "Trip not found",
      });
      return;
    }

    // Check ownership
    if (trip.createdBy.toString() !== user._id.toString()) {
      res.status(403).json({
        success: false,
        message: "You are not allowed to delete this trip",
      });
      return;
    }

    // Don't allow deleting started or completed trips
    if (
      trip.status === TripStatus.STARTED ||
      trip.status === TripStatus.COMPLETED
    ) {
      res.status(400).json({
        success: false,
        message: "This trip cannot be deleted",
      });
      return;
    }

    // Don't allow deleting if someone has already joined
    if (trip.currentOrders > 0) {
      res.status(400).json({
        success: false,
        message: "Cannot delete a trip that already has orders",
      });
      return;
    }

    // Delete trip
    await trip.deleteOne();

    res.status(200).json({
      success: true,
      message: "Trip deleted successfully",
    });

  } catch (error) {
    next(error);
  }
};

export const completeTrip = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Get trip ID from URL
    const tripId = req.params.id;

    // 2. Find the trip
    const trip = await Trip.findById(tripId);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // 3. Check whether logged-in user created this trip
    if (trip.createdBy.toString() !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to complete this trip",
      });
    }

    // 4. Trip must be STARTED before it can be completed
    if (trip.status !== TripStatus.STARTED) {
      return res.status(400).json({
        success: false,
        message: "Only started trips can be completed",
      });
    }

    // 5. Change status
    trip.status = TripStatus.COMPLETED;

    // 6. Save updated trip
    await trip.save();

    // 7. Send response
    return res.status(200).json({
      success: true,
      message: "Trip completed successfully",
      data: trip,
    });
  } catch (error) {
    next(error);
  }
};