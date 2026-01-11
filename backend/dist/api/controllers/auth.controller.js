"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.me = me;
const db_1 = __importDefault(require("../../config/db"));
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
    // 1️⃣ Find user
    const userResult = await db_1.default.query("SELECT id, role FROM users WHERE email = $1", [email]);
    if (userResult.rowCount === 0) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    const user = userResult.rows[0];
    // 2️⃣ Sign JWT
    const token = (0, jwt_1.signJwt)({
        userId: user.id,
        role: user.role,
    });
    // 3️⃣ Set HttpOnly Cookie
    const isProd = config_1.default.NODE_ENV === "production";
    res.cookie("access_token", token, {
        httpOnly: true,
        secure: false, // localhost
        sameSite: "lax",
        domain: isProd ? config_1.default.COOKIE_DOMAIN : undefined,
        maxAge: 4 * 60 * 60 * 1000,
    });
    return res.json({
        message: "Login successful",
        role: user.role,
    });
}
/**
 * AUTH SESSION CHECK (ME)
 */
async function me(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    return res.json({
        userId: req.user.userId,
        role: req.user.role,
    });
}
