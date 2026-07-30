import mongoose from "mongoose";
import { TripStatus } from "../types/enum.js";

export interface ITrip extends Document {
    createdBy: mongoose.Types.ObjectId;

    pg: mongoose.Types.ObjectId;
    destination: string;
    departureTime: Date;
    acceptOrdersUntil: Date;
    expectedReturnTime: Date;
    maxOrders: number;
    currentOrders: number;
    carryingFee: number;
    notes?: string;
    status: TripStatus;
}

const tripSchema = new mongoose.Schema<ITrip>(
{
    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    pg:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"PG",
        required:true
    },
    destination:{
        type:String,
        required:true,
        trim:true
    },
    departureTime:{
        type:Date,
        required:true
    },
    acceptOrdersUntil:{
        type:Date,
        required:true
    },
    expectedReturnTime:{
        type:Date,
        required:true
    },
    maxOrders:{
        type:Number,
        required:true,
        min:1
    },
    currentOrders:{
        type:Number,
        default:0
    },
    carryingFee:{
        type:Number,
        required:true,
        min:0
    },
    notes:{
        type:String,
        trim:true
    },
    status:{
        type:String,
        enum:Object.values(TripStatus),
        default:TripStatus.ACTIVE
    }
},
{
    timestamps:true
}
);

const Trip = mongoose.model<ITrip>("Trip",tripSchema);

export default Trip;