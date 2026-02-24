"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function deleteUserByEmail(email) {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error("MONGODB_URI is not defined in environment variables");
        }
        await mongoose_1.default.connect(mongoUri);
        console.log("✅ Connected to MongoDB");
        const result = await User_1.default.deleteOne({ email });
        if (result.deletedCount === 0) {
            console.log(`⚠️  No user found with email: ${email}`);
        }
        else {
            console.log(`✅ User with email ${email} deleted successfully`);
        }
        process.exit(0);
    }
    catch (error) {
        console.error("❌ Error deleting user:", error);
        process.exit(1);
    }
}
const emailToDelete = process.argv[2] || "admin@example.com";
deleteUserByEmail(emailToDelete);
