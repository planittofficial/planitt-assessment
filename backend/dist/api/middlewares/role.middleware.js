"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireCandidate = requireCandidate;
exports.requireAdmin = requireAdmin;
exports.requireRole = requireRole;
function requireCandidate(req, res, next) {
    const role = req.user?.role?.toUpperCase();
    console.log("DEBUG: Checking role for candidate access:", role, "User:", req.user);
    if (role !== "CANDIDATE") {
        return res.status(403).json({ message: "Access denied" });
    }
    next();
}
function requireAdmin(req, res, next) {
    const role = req.user?.role?.toUpperCase();
    if (role !== "ADMIN") {
        return res.status(403).json({ message: "Access denied" });
    }
    next();
}
function requireRole(roleName) {
    return (req, res, next) => {
        const role = req.user?.role?.toUpperCase();
        if (role !== roleName.toUpperCase()) {
            return res.status(403).json({ message: "Access denied" });
        }
        next();
    };
}
