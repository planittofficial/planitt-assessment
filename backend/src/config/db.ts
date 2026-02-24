import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    // Use the provided URI as-is. Do not naively convert `mongodb+srv://` to
    // `mongodb://` — Atlas SRV URIs require DNS SRV lookups to retrieve the
    // cluster host list. If SRV DNS resolution is not available on the
    // environment/network, obtain a standard (non-SRV) connection string from
    // Atlas and put it in `MONGODB_URI` instead.
    await mongoose.connect(mongoUri, {
      retryWrites: true,
      w: "majority",
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      // Explicitly enable TLS for Atlas connections (mongodb+srv implies TLS,
      // but being explicit helps in some environments).
      tls: true,
    });

    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};

export default connectDB;
