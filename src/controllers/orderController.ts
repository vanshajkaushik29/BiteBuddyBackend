import type { Request, Response, NextFunction } from "express";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Trip from "../models/Trip.js";
import { TripStatus } from "../types/enum.js";

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      tripId,
      food,
      price,
      quantity,
      pickupLocation,
    } = req.body;

    // 1. Check required fields
    if (
      !tripId ||
      !food ||
      price === undefined ||
      !quantity ||
      !pickupLocation
    ) {
      res.status(400).json({
        success: false,
        message: "All required fields are required",
      });
      return;
    }

    // 2. Find logged-in user
    const user = await User.findById(req.user!.id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // 3. Find selected trip
    const trip = await Trip.findById(tripId);

    if (!trip) {
      res.status(404).json({
        success: false,
        message: "Trip not found",
      });
      return;
    }

    // 4. Check whether trip is still accepting orders
    if (trip.status !== TripStatus.ACTIVE) {
      res.status(400).json({
        success: false,
        message: "This trip is not accepting orders",
      });
      return;
    }

    // 5. Check whether order deadline has passed
    if (new Date() > trip.acceptOrdersUntil) {
      res.status(400).json({
        success: false,
        message: "Order acceptance time has ended",
      });
      return;
    }

    // 6. Check whether trip has available space
    if (trip.currentOrders >= trip.maxOrders) {
      res.status(400).json({
        success: false,
        message: "This trip has reached its maximum orders",
      });
      return;
    }

    // 7. Make sure price and quantity are valid
    if (price < 0 || quantity < 1) {
      res.status(400).json({
        success: false,
        message: "Price cannot be negative and quantity must be at least 1",
      });
      return;
    }

    // 8. Make sure user and trip belong to same PG
    if (user.pg.toString() !== trip.pg.toString()) {
      res.status(403).json({
        success: false,
        message: "You can only order from trips belonging to your PG",
      });
      return;
    }

    // 9. Get carrying fee from trip
    const carryingFee = trip.carryingFee;

    // 10. Calculate total price
    const totalPrice = price * quantity + carryingFee;

    // 11. Create order
    const order = await Order.create({
      orderedBy: user._id,
      trip: trip._id,
      food: food.trim(),
      price,
      quantity,
      pickupLocation: pickupLocation.trim(),
      pg: user.pg,
      carryingFee,
      totalPrice,
    });

    // 12. Increase current order count of trip
    trip.currentOrders += 1;
    await trip.save();

    // 13. Send response
    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const getmyOrders = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user!.id;

        const orders = await Order.find({
            orderedBy: userId
        }).populate("trip");

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No orders found for this user",
            });
        }

        res.status(200).json({
            success: true,
            message: "Orders found successfully",
            data: orders,
        });

    } catch (error) {
        next(error);
    }
};



 