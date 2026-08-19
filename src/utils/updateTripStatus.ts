import Trip from "../models/Trip.js";
import { TripStatus } from "../types/enum.js";

export const updateTripStatus = async (trip: any) => {
  const currentTime = new Date();

  if (
    trip.status === TripStatus.ACTIVE &&
    currentTime >= trip.departureTime
  ) {
    trip.status = TripStatus.STARTED;

    await trip.save();
  }

  return trip;
};