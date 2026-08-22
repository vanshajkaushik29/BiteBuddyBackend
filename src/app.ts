import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js"
import tripRoutes from "./routes/tripRoutes.js"
import pgRoutes from "./routes/pgRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import cookieParser from "cookie-parser";
import orderRoutes from "./routes/orderRoutes.js";
import rewardRoutes from "./routes/rewardRoutes.js";
const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    credentials: true,
  })
);

app.use(express.json());

app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("BiteBuddy backend is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/trips",tripRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/pgs", pgRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorHandler);

export default app;
