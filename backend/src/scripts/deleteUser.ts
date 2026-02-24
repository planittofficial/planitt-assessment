import mongoose from "mongoose";
import User from "../models/User";
import dotenv from "dotenv";

dotenv.config();

async function deleteUserByEmail(email: string) {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    const result = await User.deleteOne({ email });

    if (result.deletedCount === 0) {
      console.log(`⚠️  No user found with email: ${email}`);
    } else {
      console.log(`✅ User with email ${email} deleted successfully`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    process.exit(1);
  }
}

const emailToDelete = process.argv[2] || "admin@example.com";
deleteUserByEmail(emailToDelete);
