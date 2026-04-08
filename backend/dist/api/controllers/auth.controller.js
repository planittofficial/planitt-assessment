"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.me = me;
exports.logout = logout;
const User_1 = __importDefault(require("../../models/User"));
const jwt_1 = require("../../utils/jwt");
const config_1 = __importDefault(require("../../config"));
/**
 * LOGIN
 */
async function login(req, res) {
    const { email, password } = req.body;
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }
    const user = await User_1.default.findOne({ email });
    if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    if (String(user.role || "").toUpperCase() === "ADMIN") {
        const configuredAdminPassword = config_1.default.ADMIN_SHARED_PASSWORD;
        if (!configuredAdminPassword) {
            return res.status(500).json({
                message: "Admin login password is not configured on the server.",
            });
        }
        if (!password || password !== configuredAdminPassword) {
            return res.status(401).json({ message: "Invalid admin password" });
        }
    }
    const token = (0, jwt_1.signJwt)({
        userId: user._id.toString(),
        role: user.role,
    });
    const cookieOptions = {
        httpOnly: true,
        secure: config_1.default.COOKIE_SECURE,
        sameSite: config_1.default.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 4 * 60 * 60 * 1000,
    };
    if (config_1.default.COOKIE_DOMAIN) {
        cookieOptions.domain = config_1.default.COOKIE_DOMAIN;
    }
    res.cookie("access_token", token, cookieOptions);
    return res.json({
        message: "Login successful",
        token,
        role: user.role,
        email: user.email,
        full_name: user.full_name,
    });
}
/**
 * AUTH SESSION CHECK (ME)
 */
async function me(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await User_1.default.findById(req.user.userId);
    if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    return res.json({
        userId: user._id.toString(),
        role: user.role,
        email: user.email,
        full_name: user.full_name,
    });
}
/**
 * LOGOUT
 */
async function logout(_req, res) {
    const cookieOptions = {
        httpOnly: true,
        secure: config_1.default.COOKIE_SECURE,
        sameSite: config_1.default.NODE_ENV === "production" ? "none" : "lax",
    };
    if (config_1.default.COOKIE_DOMAIN) {
        cookieOptions.domain = config_1.default.COOKIE_DOMAIN;
    }
    res.clearCookie("access_token", cookieOptions);
    return res.json({ message: "Logout successful" });
}
