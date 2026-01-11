import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import config from "./config";
import authRoutes from "./api/routes/auth";
import attemptRoutes from "./api/routes/attempt";
import pool from "./config/db";
import violationRoutes from "./api/routes/violation";
import adminRoutes from "./api/routes/admin";
import resultRoutes from "./api/routes/result";




const app = express();

// ---------- Middlewares ----------
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);



// ---------- Routes ----------
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
    await pool.query("SELECT 1");
    console.log("🚀 Database connected");

    app.listen(config.PORT, () => {
      console.log(
        `🚀 Server running on port ${config.PORT} (${config.NODE_ENV})`
      );
    });
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1); // VERY IMPORTANT
  }
}

startServer();
