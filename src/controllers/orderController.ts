import type { Request, Response, NextFunction } from "express";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Trip from "../models/Trip.js";
import { TripStatus } from "../types/enum.js";
import { OrderStatus } from "../types/enum.js";

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

export const tripOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tripId = req.params.tripId;

    // 1. Check whether the trip exists
    const trip = await Trip.findById(tripId);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // 2. Find all orders belonging to this trip
    // 3. Populate the user who placed each order
    const orders = await Order.find({
      trip: trip._id,
    }).populate("orderedBy", "name phone profilePic");

    // 4. If there are no orders
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No orders found for this trip",
      });
    }

    // 5. Return orders
    return res.status(200).json({
      success: true,
      message: "Orders found successfully",
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Get order ID from URL
    const orderId = req.params.id;

    // 2. Find the order
    const order = await Order.findById(orderId)
      .populate("orderedBy", "name phone profilePic")
      .populate("trip", "destination departureTime expectedReturnTime");

    // 3. Check whether order exists
    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    // 4. Get logged-in user's ID
    const userId = req.user!.id;

    // 5. Check whether logged-in user placed this order
    const isOrderOwner =
      order.orderedBy._id.toString() === userId;

    // 6. Check whether logged-in user created the trip
    const trip = await Trip.findById(order.trip._id);

    if (!trip) {
      res.status(404).json({
        success: false,
        message: "Trip associated with this order not found",
      });
      return;
    }

    const isTripCreator =
      trip.createdBy.toString() === userId;

    // 7. Allow only order owner or trip creator
    if (!isOrderOwner && !isTripCreator) {
      res.status(403).json({
        success: false,
        message: "You are not allowed to view this order",
      });
      return;
    }

    // 8. Return order details
    res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};



export const updateOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orderId = req.params.id;

    const { food, quantity, pickupLocation } = req.body;

    // 1. Find the order
    const order = await Order.findById(orderId);

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    // 2. Check whether the logged-in user placed this order
    if (order.orderedBy.toString() !== req.user!.id) {
      res.status(403).json({
        success: false,
        message: "You are not allowed to update this order",
      });
      return;
    }

    // 3. Find the trip associated with this order
    const trip = await Trip.findById(order.trip);

    if (!trip) {
      res.status(404).json({
        success: false,
        message: "Trip not found",
      });
      return;
    }

    // 4. Check whether the trip has already started
    if (trip.status !== TripStatus.ACTIVE) {
      res.status(400).json({
        success: false,
        message: "Order cannot be updated after the trip has started",
      });
      return;
    }

    // 5. Check whether order deadline has passed
    if (new Date() > trip.acceptOrdersUntil) {
      res.status(400).json({
        success: false,
        message: "Order can no longer be updated",
      });
      return;
    }

    // 6. Update food if provided
    if (food !== undefined) {
      if (food.trim() === "") {
        res.status(400).json({
          success: false,
          message: "Food cannot be empty",
        });
        return;
      }

      order.food = food.trim();
    }

    // 7. Update quantity if provided
    if (quantity !== undefined) {
      if (quantity < 1) {
        res.status(400).json({
          success: false,
          message: "Quantity must be at least 1",
        });
        return;
      }

      order.quantity = quantity;
    }

    // 8. Update pickup location if provided
    if (pickupLocation !== undefined) {
      if (pickupLocation.trim() === "") {
        res.status(400).json({
          success: false,
          message: "Pickup location cannot be empty",
        });
        return;
      }

      order.pickupLocation = pickupLocation.trim();
    }

    // 9. Recalculate total price
    order.totalPrice =
      order.quantity * (order.price + order.carryingFee);

    // 10. Save updated order
    await order.save();

    // 11. Return updated order
    const updatedOrder = await Order.findById(order._id)
      .populate("orderedBy", "name phone profilePic")
      .populate("trip", "destination departureTime expectedReturnTime");

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const orderId = req.params.id;

    // 1. Find logged-in user
    const user = await User.findById(req.user!.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 2. Find order
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // 3. Only the person who placed the order can cancel it
    if (order.orderedBy.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to cancel this order",
      });
    }

    // 4. Check current order status
    if (order.status === OrderStatus.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: "Completed orders cannot be cancelled",
      });
    }

    if (order.status === OrderStatus.CANCELLED) {
      return res.status(400).json({
        success: false,
        message: "Order is already cancelled",
      });
    }

    // 5. Find associated trip
    const trip = await Trip.findById(order.trip);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Associated trip not found",
      });
    }

    // 6. If trip has started, cancel but apply reward penalty
    if (trip.status === TripStatus.STARTED) {
      const cancellationPenalty = 10;

      user.rewardPoints = Math.max(
        0,
        user.rewardPoints - cancellationPenalty
      );

      await user.save();
    }

    // 7. Cancel the order
    order.status = OrderStatus.CANCELLED;
    await order.save();

    // 8. Reduce current orders of the trip
    if (trip.currentOrders > 0) {
      trip.currentOrders -= 1;
      await trip.save();
    }

    // 9. Send response
    return res.status(200).json({
      success: true,
      message:
        trip.status === TripStatus.STARTED
          ? "Order cancelled. 10 reward points have been deducted."
          : "Order cancelled successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};