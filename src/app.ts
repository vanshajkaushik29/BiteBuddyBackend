import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js"
import tripRoutes from "./routes/tripRoutes.js"
import pgRoutes from "./routes/pgRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import cookieParser from "cookie-parser";
import orderRoutes from "./routes/orderRoutes.js";
import rewardRoutes from "./routes/rewardRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import campaignRoutes from "./routes/campaignRoutes.js";
const app = express();

app.set("trust proxy", 1);

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((url) => url.trim())
  : ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
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
app.use("/api/admin", adminRoutes);
app.use("/api/campaigns", campaignRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorHandler);

export default app;
