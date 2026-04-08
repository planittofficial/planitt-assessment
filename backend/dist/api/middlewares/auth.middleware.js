"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../../config"));
function requireAuth(req, res, next) {
    let token = req.cookies.access_token;
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.JWT_SECRET);
        req.user = {
            userId: decoded.userId,
            role: decoded.role,
        };
        next();
    }
    catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
}
