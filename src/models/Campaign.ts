import mongoose, { Document } from "mongoose";

export enum CampaignRewardType {
  CASH = "CASH",
  VOUCHER = "VOUCHER",
  DISCOUNT = "DISCOUNT",
  PARTNER_DEAL = "PARTNER_DEAL",
}

export interface ICampaign extends Document {
  title: string;
  description: string;
  badgeText?: string;
  rewardType: CampaignRewardType;
  targetDeliveries: number;
  rewardAmount?: number;
  voucherCode?: string;
  voucherDetails?: string;
  partnerName?: string;
  partnerLogo?: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  minOrderValue: number;
  maxClaimsPerUser: number;
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new mongoose.Schema<ICampaign>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    badgeText: {
      type: String,
      trim: true,
      default: "Monthly Quest",
    },
    rewardType: {
      type: String,
      enum: Object.values(CampaignRewardType),
      required: true,
      default: CampaignRewardType.CASH,
    },
    targetDeliveries: {
      type: Number,
      required: true,
      min: 1,
      default: 20,
    },
    rewardAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    voucherCode: {
      type: String,
      trim: true,
    },
    voucherDetails: {
      type: String,
      trim: true,
    },
    partnerName: {
      type: String,
      trim: true,
    },
    partnerLogo: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    minOrderValue: {
      type: Number,
      default: 0,
    },
    maxClaimsPerUser: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

campaignSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

const Campaign = mongoose.model<ICampaign>("Campaign", campaignSchema);

export default Campaign;
