# BiteBuddy - Order Delivery 2-Step Verification & Rewards Module Technical Notes

> **Purpose**: This document contains comprehensive technical notes for learning backend engineering in BiteBuddy. You can copy and paste this into your notes repository.

---

## Table of Contents
1. [Overview & Architecture Summary](#overview--architecture-summary)
2. [Feature 1: Deliver Order (`PATCH /api/orders/:id/deliver`)](#feature-1-deliver-order-patch-apiordersiddeliver)
3. [Feature 2: Confirm Order & Award Rewards (`PATCH /api/orders/:id/confirm`)](#feature-2-confirm-order--award-rewards-patch-apiordersidconfirm)
4. [Feature 3: Rewards Module (`GET /api/rewards`)](#feature-3-rewards-module-get-apirewards)
5. [Summary of Files & Schema Changes](#summary-of-files--schema-changes)

---

## Overview & Architecture Summary

In BiteBuddy, food pooling relies on a trust-oriented, 2-step verification system for order delivery:
1. **Trip Creator Action (`DELIVER`)**: Once a trip has started (`TripStatus.STARTED`), the trip creator marks an accepted order as `DELIVERED`.
2. **Requester Action (`CONFIRM`)**: The student who placed the order confirms receipt. This changes the order status to `COMPLETED` and awards **+10 reward points** to the trip creator.

### Core Engineering Principles Applied:
- **Idempotency**: Reward points are protected by an explicit boolean flag (`isRewardAwarded: true`) on the `Order` document and idempotent conditional checks. Points are credited exactly once, even if requests are duplicated or repeated.
- **Backend Authorization**: Ownership (`orderedBy`, `createdBy`) is strictly derived from the authenticated JWT session (`req.user.id`), never trusted from client request payloads.
- **Audit Logging**: All reward additions and cancellation penalties are stored as distinct transaction records in the `Reward` collection.

---

## Feature 1: Deliver Order (`PATCH /api/orders/:id/deliver`)

### 1. Business Flow
1. Trip Creator departs PG and starts the trip (`trip.status` = `STARTED`).
2. Trip Creator delivers food to the requester and triggers `PATCH /api/orders/:id/deliver`.
3. Backend validates that the logged-in user is the creator of the trip linked to the order.
4. Backend updates order status from `ACCEPTED` to `DELIVERED`.

### 2. Request Data
- **HTTP Method**: `PATCH`
- **URL**: `http://localhost:5000/api/orders/:id/deliver`
- **Headers**: `Cookie: token=<jwt_token>` (or `Authorization: Bearer <jwt_token>`)
- **Params**: `id` (Order MongoDB ObjectId)
- **Body**: None required.

### 3. Backend-Derived Data
- `userId` = `req.user!.id` (Extracted from JWT by `protect` middleware).
- `trip.createdBy` (Extracted by querying the database for the trip associated with the order).

### 4. Validations & Authorization
1. **User Authentication**: Check if `req.user` exists. If not -> `404 User not found`.
2. **Order Existence**: Check if Order exists by ID. If not -> `404 Order not found`.
3. **Trip Association**: Check if Trip exists by `order.trip`. If not -> `404 Associated trip not found`.
4. **Creator Authorization**: Verify `trip.createdBy.toString() === userId.toString()`. If false -> `403 Only the trip creator can mark an order as delivered`.
5. **Trip Status Check**: Verify `trip.status === TripStatus.STARTED`. If false -> `400 Order can only be marked as delivered after the trip has started`.
6. **Order Status State Machine Rules**:
   - Already `DELIVERED` -> `400 Order is already marked as delivered`
   - Already `COMPLETED` -> `400 Order is already completed`
   - Already `CANCELLED` -> `400 Cannot deliver a cancelled order`
   - Not `ACCEPTED` -> `400 Only accepted orders can be delivered`

### 5. MongoDB Queries
```ts
// 1. Fetch logged-in user
const user = await User.findById(req.user!.id);

// 2. Fetch order
const order = await Order.findById(orderId);

// 3. Fetch trip
const trip = await Trip.findById(order.trip);

// 4. Update order status
order.status = OrderStatus.DELIVERED;
await order.save();

// 5. Fetch updated order with populated references
const updatedOrder = await Order.findById(order._id)
  .populate("orderedBy", "name phone profilePic")
  .populate("trip", "destination departureTime expectedReturnTime status");
```

### 6. Responses
#### Success (`200 OK`)
```json
{
  "success": true,
  "message": "Order marked as delivered successfully",
  "data": {
    "_id": "66c4c01234567890abcdef01",
    "orderedBy": {
      "_id": "66c4a01234567890abcdef02",
      "name": "Rahul Sharma",
      "phone": "+919876543210"
    },
    "trip": {
      "_id": "66c4b01234567890abcdef03",
      "destination": "Domino's Pizza",
      "status": "STARTED"
    },
    "food": "1x Cheese Burst Pizza",
    "price": 250,
    "carryingFee": 20,
    "totalPrice": 270,
    "status": "DELIVERED",
    "isRewardAwarded": false
  }
}
```

#### Error Example (`403 Forbidden`)
```json
{
  "success": false,
  "message": "Only the trip creator can mark an order as delivered"
}
```

### 7. Edge Cases
- **Non-creator attempts delivery**: User who didn't create the trip sends `deliver` request -> Blocked with `403`.
- **Trip not started yet**: Trip creator tries delivering while trip status is `ACTIVE` -> Blocked with `400`.
- **Re-delivering an already delivered order**: Order status is already `DELIVERED` -> Blocked with `400`.
- **Delivering a cancelled order**: Order status is `CANCELLED` -> Blocked with `400`.

### 8. Postman Test Details
- **Method**: `PATCH`
- **URL**: `{{baseUrl}}/api/orders/66c4c01234567890abcdef01/deliver`
- **Auth**: Cookie-based JWT for Trip Creator.

### 9. Git / PR Details
- **Commit Message**: `feat(order): add deliverOrder controller and route for 2-step verification`
- **PR Description**: Implements step 1 of order verification where the trip creator marks an order as DELIVERED after the trip starts.

---

## Feature 2: Confirm Order & Award Rewards (`PATCH /api/orders/:id/confirm`)

### 1. Business Flow
1. Requester receives food from trip creator.
2. Requester clicks "Confirm Order" (`PATCH /api/orders/:id/confirm`).
3. Backend validates that logged-in user is the requester who created the order.
4. Backend checks order status is `DELIVERED`.
5. Backend changes order status to `COMPLETED`.
6. Backend checks `isRewardAwarded` on the order. If `false`:
   - Increases trip creator's `rewardPoints` by `+10`.
   - Creates a `Reward` transaction history record (`EARNED_TRIP_COMPLETED`).
   - Sets `order.isRewardAwarded = true`.

### 2. Request Data
- **HTTP Method**: `PATCH`
- **URL**: `http://localhost:5000/api/orders/:id/confirm`
- **Headers**: `Cookie: token=<jwt_token>`
- **Params**: `id` (Order MongoDB ObjectId)

### 3. Backend-Derived Data
- `userId` = `req.user!.id`
- `order.orderedBy` (Loaded from database)
- `trip.createdBy` (Loaded from associated Trip document)

### 4. Validations & Authorization
1. **User Authentication**: Ensure user is authenticated. If not -> `404 User not found`.
2. **Order Existence**: Find order by ID. If not -> `404 Order not found`.
3. **Requester Authorization**: Check `order.orderedBy.toString() === userId.toString()`. If false -> `403 Only the requester who placed the order can confirm delivery`.
4. **Order Status Rules**:
   - Already `COMPLETED` -> `400 Order is already completed`
   - `CANCELLED` -> `400 Cannot confirm a cancelled order`
   - Not `DELIVERED` -> `400 Order must be marked as DELIVERED by the trip creator before it can be confirmed`

### 5. MongoDB Queries
```ts
// 1. Fetch order
const order = await Order.findById(orderId);

// 2. Fetch associated trip
const trip = await Trip.findById(order.trip);

// 3. Mark order COMPLETED
order.status = OrderStatus.COMPLETED;

// 4. Award rewards idempotently
if (!order.isRewardAwarded) {
  const tripCreator = await User.findById(trip.createdBy);
  if (tripCreator) {
    tripCreator.rewardPoints += 10;
    await tripCreator.save();

    await Reward.create({
      user: tripCreator._id,
      order: order._id,
      points: 10,
      type: RewardType.EARNED_TRIP_COMPLETED,
      description: "Reward points earned for successfully delivering order",
    });
  }
  order.isRewardAwarded = true;
}

await order.save();
```

### 6. Responses
#### Success (`200 OK`)
```json
{
  "success": true,
  "message": "Order delivery confirmed and completed successfully. 10 reward points awarded to trip creator.",
  "data": {
    "_id": "66c4c01234567890abcdef01",
    "status": "COMPLETED",
    "isRewardAwarded": true
  }
}
```

### 7. Edge Cases & Idempotency Proof
- **Re-confirming Completed Order**: Calling confirm multiple times fails at order status check (`400 Order is already completed`).
- **Duplicate Request Race Condition**: If two requests bypass the status check simultaneously, `isRewardAwarded` check prevents double increment of points.
- **Trip Creator self-confirmation**: If trip creator attempts to confirm order placed by another user -> Blocked with `403`.

### 8. Postman Test Details
- **Method**: `PATCH`
- **URL**: `{{baseUrl}}/api/orders/66c4c01234567890abcdef01/confirm`
- **Auth**: Cookie-based JWT for Requester.

### 9. Git / PR Details
- **Commit Message**: `feat(order): add confirmOrder endpoint with idempotent reward point allocation`

---

## Feature 3: Rewards Module (`GET /api/rewards`)

### 1. Business Flow
1. User opens the "Rewards" screen in BiteBuddy app.
2. App sends `GET /api/rewards`.
3. Backend fetches user's total `rewardPoints` and full history of earned rewards and cancellation penalties sorted by newest first.

### 2. Request Data
- **HTTP Method**: `GET`
- **URL**: `http://localhost:5000/api/rewards`
- **Headers**: `Cookie: token=<jwt_token>`

### 3. Backend-Derived Data
- `userId` = `req.user!.id`

### 4. MongoDB Queries
```ts
const user = await User.findById(userId);

const rewards = await Reward.find({ user: userId })
  .sort({ createdAt: -1 })
  .populate("order", "food price totalPrice status");
```

### 5. Response Structure (`200 OK`)
```json
{
  "success": true,
  "message": "Rewards fetched successfully",
  "data": {
    "rewardPoints": 30,
    "history": [
      {
        "_id": "66c4d01234567890abcdef05",
        "user": "66c4a01234567890abcdef02",
        "order": {
          "_id": "66c4c01234567890abcdef01",
          "food": "1x Cheese Burst Pizza",
          "totalPrice": 270,
          "status": "COMPLETED"
        },
        "points": 10,
        "type": "EARNED_TRIP_COMPLETED",
        "description": "Reward points earned for successfully delivering order",
        "createdAt": "2026-08-20T12:00:00.000Z"
      }
    ]
  }
}
```

---

## Summary of Files & Schema Changes

| File | Type | Purpose / Description |
|---|---|---|
| [`src/types/enum.ts`](file:///c:/Users/vansh/Desktop/BiteBuddyBackend/src/types/enum.ts) | Modified | Added `DELIVERED` status to `OrderStatus` and created `RewardType` enum |
| [`src/models/Order.ts`](file:///c:/Users/vansh/Desktop/BiteBuddyBackend/src/models/Order.ts) | Modified | Added `isRewardAwarded: boolean` field for idempotency |
| [`src/models/Reward.ts`](file:///c:/Users/vansh/Desktop/BiteBuddyBackend/src/models/Reward.ts) | New | Created Mongoose model for tracking reward transactions & penalties |
| [`src/controllers/orderController.ts`](file:///c:/Users/vansh/Desktop/BiteBuddyBackend/src/controllers/orderController.ts) | Modified | Implemented `deliverOrder`, `confirmOrder`, and reward penalty logging in `cancelOrder` |
| [`src/controllers/rewardController.ts`](file:///c:/Users/vansh/Desktop/BiteBuddyBackend/src/controllers/rewardController.ts) | New | Implemented `getMyRewards` controller |
| [`src/routes/orderRoutes.ts`](file:///c:/Users/vansh/Desktop/BiteBuddyBackend/src/routes/orderRoutes.ts) | Modified | Added `PATCH /:id/deliver` and `PATCH /:id/confirm` routes |
| [`src/routes/rewardRoutes.ts`](file:///c:/Users/vansh/Desktop/BiteBuddyBackend/src/routes/rewardRoutes.ts) | New | Defined `/api/rewards` protected route |
| [`src/app.ts`](file:///c:/Users/vansh/Desktop/BiteBuddyBackend/src/app.ts) | Modified | Mounted `rewardRoutes` at `/api/rewards` |
