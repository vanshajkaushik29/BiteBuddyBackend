import express from "express";
import authRoutes from "./routes/authRoutes.js"
import { errorHandler } from "./middlewares/errorHandler.js";
import cookieParser from "cookie-parser";
const app = express();

app.use(express.json());

app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("BiteBuddy backend is running");
});

app.use("/api/auth", authRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorHandler);

export default app;