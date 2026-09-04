import mongoose, { Document } from "mongoose";

export interface ICampaignProgress extends Document {
  user: mongoose.Types.ObjectId;
  campaign: mongoose.Types.ObjectId;
  completedDeliveries: number;
  isClaimed: boolean;
  claimedAt?: Date;
  rewardCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const campaignProgressSchema = new mongoose.Schema<ICampaignProgress>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    completedDeliveries: {
      type: Number,
      default: 0,
      min: 0,
    },
    isClaimed: {
      type: Boolean,
      default: false,
    },
    claimedAt: {
      type: Date,
    },
    rewardCode: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

campaignProgressSchema.index({ user: 1, campaign: 1 }, { unique: true });

const CampaignProgress = mongoose.model<ICampaignProgress>(
  "CampaignProgress",
  campaignProgressSchema
);

export default CampaignProgress;
