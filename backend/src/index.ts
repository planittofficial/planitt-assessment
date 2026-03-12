import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import config from "./config";
import authRoutes from "./api/routes/auth";
import attemptRoutes from "./api/routes/attempt";
import connectDB from "./config/db";
import violationRoutes from "./api/routes/violation";
import adminRoutes from "./api/routes/admin";
import resultRoutes from "./api/routes/result";

const app = express();

// ---------- Middlewares ----------
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: true, // Reflect the request origin to allow credentials from any origin
    credentials: true,
  })
);

// ---------- Routes ----------
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});
app.use("/api/auth", authRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/violations", violationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/results", resultRoutes);

// ---------- Error Handler ----------
app.use(
  (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    console.error("❌ Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
);

// ---------- Start Server AFTER DB Ready ----------
async function startServer() {
  try {
    await connectDB();
    console.log("🚀 Database connected");

    app.listen(config.PORT, () => {
      console.log(
        `🚀 Server running on port ${config.PORT} (${config.NODE_ENV})`
      );
    });
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
}

startServer();
