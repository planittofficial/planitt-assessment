"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function createAdminUser() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error("MONGODB_URI is not defined in environment variables");
        }
        await mongoose_1.default.connect(mongoUri, {
            retryWrites: true,
            w: "majority",
        });
        console.log("✅ Connected to MongoDB");
        const email = "admin@example.com";
        const fullName = "Admin User";
        const existingAdmin = await User_1.default.findOne({ email });
        if (existingAdmin) {
            console.log(`⚠️  Admin user with email ${email} already exists`);
            process.exit(0);
        }
        const adminUser = await User_1.default.create({
            email,
            full_name: fullName,
            password_hash: "admin123", // Placeholder since login currently only checks email
            role: "ADMIN",
        });
        console.log("✅ Admin user created successfully!");
        console.log(`Email: ${adminUser.email}`);
        console.log(`Full Name: ${adminUser.full_name}`);
        console.log(`Role: ${adminUser.role}`);
        console.log(`User ID: ${adminUser._id}`);
        process.exit(0);
    }
    catch (error) {
        console.error("❌ Error creating admin user:", error);
        process.exit(1);
    }
}
createAdminUser();
