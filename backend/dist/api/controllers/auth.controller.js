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
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }
    const user = await User_1.default.findOne({ email });
    if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = (0, jwt_1.signJwt)({
        userId: user._id.toString(),
        role: user.role,
    });
    res.cookie("access_token", token, {
        httpOnly: true,
        secure: config_1.default.COOKIE_SECURE,
        sameSite: config_1.default.NODE_ENV === "production" ? "none" : "lax",
        domain: config_1.default.COOKIE_DOMAIN,
        maxAge: 4 * 60 * 60 * 1000,
    });
    return res.json({
        message: "Login successful",
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
    res.clearCookie("access_token", {
        httpOnly: true,
        secure: config_1.default.COOKIE_SECURE,
        sameSite: config_1.default.NODE_ENV === "production" ? "none" : "lax",
        domain: config_1.default.COOKIE_DOMAIN,
    });
    return res.json({ message: "Logout successful" });
}
