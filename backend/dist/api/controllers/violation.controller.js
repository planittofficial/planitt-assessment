"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logViolation = logViolation;
exports.getViolationCount = getViolationCount;
const Attempt_1 = __importDefault(require("../../models/Attempt"));
const Violation_1 = __importDefault(require("../../models/Violation"));
const violation_service_1 = require("../../services/violation.service");
const timer_service_1 = require("../../services/timer.service");
const attempt_status_1 = require("../../utils/attempt-status");
const mongoose_1 = __importDefault(require("mongoose"));
async function logViolation(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { attemptId, violationType } = req.body;
        const userId = req.user.userId;
        if (!attemptId || !violationType) {
            return res.status(400).json({
                message: "attemptId and violationType are required",
            });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(attemptId)) {
            return res.status(400).json({ message: "Invalid attemptId" });
        }
        const attempt = await Attempt_1.default.findOne({
            _id: attemptId,
            user_id: userId,
        });
        if (!attempt) {
            return res.status(404).json({ message: "Attempt not found" });
        }
        if (!(0, attempt_status_1.isActiveAttemptStatus)(attempt.status)) {
            return res.status(409).json({
                message: "Attempt already submitted",
            });
        }
        const timerCheck = await (0, timer_service_1.enforceTimeLimit)(attemptId);
        if (timerCheck.expired) {
            return res.status(403).json({
                message: "Time expired. Attempt auto-submitted.",
                autoSubmitted: true,
                reason: "TIME_EXPIRED",
            });
        }
        await Violation_1.default.create({
            attempt_id: attemptId,
            violation_type: violationType,
        });
        const enforcement = await (0, violation_service_1.checkAutoSubmit)(attemptId);
        if (enforcement.autoSubmit) {
            await Attempt_1.default.findByIdAndUpdate(attemptId, {
                status: "terminated",
                submitted_at: new Date(),
                auto_submitted: true,
                result: "FAIL",
            });
            return res.status(200).json({
                message: "Violation logged. Attempt auto-submitted.",
                autoSubmitted: true,
                reason: enforcement.reason,
                violationCount: enforcement.totalViolations,
            });
        }
        return res.status(201).json({
            message: "Violation logged",
            autoSubmitted: false,
            violationCount: enforcement.totalViolations,
        });
    }
    catch (error) {
        console.error("❌ logViolation error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
async function getViolationCount(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { attemptId } = req.params;
        const userId = req.user.userId;
        if (!attemptId) {
            return res.status(400).json({ message: "attemptId is required" });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(attemptId)) {
            return res.status(400).json({ message: "Invalid attemptId" });
        }
        const attempt = await Attempt_1.default.findOne({
            _id: attemptId,
            user_id: userId,
        });
        if (!attempt) {
            return res.status(404).json({ message: "Attempt not found" });
        }
        const violationCount = await Violation_1.default.countDocuments({
            attempt_id: attemptId,
        });
        return res.status(200).json({
            attemptId,
            violationCount,
        });
    }
    catch (error) {
        console.error("getViolationCount error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
