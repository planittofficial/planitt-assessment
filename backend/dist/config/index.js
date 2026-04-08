"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || "development",
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: "4h",
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
    COOKIE_SECURE: process.env.NODE_ENV === "production",
    CORS_ORIGIN: process.env.CORS_ORIGIN ||
        "https://planitt-assessment.onrender.com,https://test.planitt.in",
    ADMIN_SHARED_PASSWORD: process.env.ADMIN_SHARED_PASSWORD || "",
};
exports.default = config;
