import mongoose from "mongoose";
import { OrderStatus } from "../types/enum.js";

export interface IOrder extends Document {
  orderedBy: mongoose.Types.ObjectId;
  trip: mongoose.Types.ObjectId;
  food: string;
  price: number;
  carryingFee: number;
  totalPrice: number;
  orderTime: Date;
  status: OrderStatus;
  pickupLocation: string;
  pg: mongoose.Types.ObjectId;
  quantity: number;
}

const orderSchema = new mongoose.Schema<IOrder>(
  {
    orderedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },

    food: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    carryingFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    orderTime: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.ACCEPTED,
    },

    pickupLocation: {
      type: String,
      required: true,
      trim: true,
    },

    pg: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PG",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model<IOrder>("Order", orderSchema);

export default Order;