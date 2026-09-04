import mongoose, { Document } from "mongoose";

export interface ISystemConfig extends Document {
  key: string;
  value: any;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const systemConfigSchema = new mongoose.Schema<ISystemConfig>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const SystemConfig = mongoose.model<ISystemConfig>("SystemConfig", systemConfigSchema);

export default SystemConfig;
