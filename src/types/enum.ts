export enum VerificationStatus {
  Pending = "pending",
  Verified = "verified",
  Rejected = "rejected",
}

export enum TripStatus{
    ACTIVE="ACTIVE",
    STARTED="STARTED",
    COMPLETED="COMPLETED",
    CANCELLED="CANCELLED"
}

export enum OrderStatus {
  ACCEPTED = "ACCEPTED",
  DELIVERED = "DELIVERED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum RewardType {
  EARNED_TRIP_COMPLETED = "EARNED_TRIP_COMPLETED",
  CANCELLATION_PENALTY = "CANCELLATION_PENALTY",
}