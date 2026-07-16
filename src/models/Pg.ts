import mongoose, { Document } from "mongoose";
import { VerificationStatus } from "../types/enum.js";

export interface IPg extends Document {
  name: string;
  normalizedName: string;
  area: string;
  normalizedArea: string;
  city: string;
  normalizedCity: string;
  state: string;
  landmark?: string;
  verificationStatus: VerificationStatus;
}

const PgSchema = new mongoose.Schema<IPg>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    normalizedName: {
      type: String,
      required: true,
    },

    area: {
      type: String,
      required: true,
      trim: true,
    },

    normalizedArea: {
      type: String,
      required: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    normalizedCity: {
      type: String,
      required: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    landmark: {
      type: String,
      trim: true,
    },

    verificationStatus: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.Pending,
    },
  },
  {
    timestamps: true,
  }
);

const PG = mongoose.model<IPg>("PG", PgSchema);

export default PG;