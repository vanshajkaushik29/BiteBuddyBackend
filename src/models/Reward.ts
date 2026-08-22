import mongoose, { Document } from "mongoose";
import { RewardType } from "../types/enum.js";

export interface IReward extends Document {
  user: mongoose.Types.ObjectId;
  order?: mongoose.Types.ObjectId;
  points: number;
  type: RewardType;
  description: string;
}

const rewardSchema = new mongoose.Schema<IReward>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    points: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(RewardType),
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Reward = mongoose.model<IReward>("Reward", rewardSchema);

export default Reward;
