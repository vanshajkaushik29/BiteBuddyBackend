import mongoose, { Document } from "mongoose";

export interface IPG extends Document {
  name: string;
  normalizedName: string;
  area: string;
  normalizedArea: string;
  city: string;
  normalizedCity: string;
  state: string;
  landmark?: string;
  createdAt: Date;
  updatedAt: Date;
}

const pgSchema = new mongoose.Schema<IPG>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    area: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedArea: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedCity: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
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
  },
  {
    timestamps: true,
  }
);

pgSchema.index({ normalizedName: 1, normalizedArea: 1, normalizedCity: 1 });
pgSchema.index({ normalizedArea: 1, normalizedCity: 1, state: 1 });

const PG = mongoose.model<IPG>("PG", pgSchema);

export default PG;
