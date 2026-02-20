"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logViolation = logViolation;
const db_1 = __importDefault(require("../../config/db"));
const violation_service_1 = require("../../services/violation.service");
const timer_service_1 = require("../../services/timer.service");
const validation_1 = require("../../utils/validation");
const attempt_status_1 = require("../../utils/attempt-status");
const attempt_schema_1 = require("../../utils/attempt-schema");
async function logViolation(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { attemptId, violationType } = req.body;
        const userId = req.user.userId;
        const submittedColumn = await (0, attempt_schema_1.getAttemptsSubmittedColumn)();
        const hasAutoSubmitted = await (0, attempt_schema_1.hasAttemptsAutoSubmittedColumn)();
        if (!attemptId || !violationType) {
            return res.status(400).json({
                message: "attemptId and violationType are required",
            });
        }
        if (!(0, validation_1.isUuid)(attemptId)) {
            return res.status(400).json({ message: "Invalid attemptId" });
        }
        const normalizedAttemptId = String(attemptId);
        // 1️⃣ Validate attempt ownership
        const attemptResult = await db_1.default.query(`SELECT status FROM attempts
       WHERE id = $1 AND user_id = $2`, [normalizedAttemptId, userId]);
        if (attemptResult.rowCount === 0) {
            return res.status(404).json({ message: "Attempt not found" });
        }
        if (!(0, attempt_status_1.isActiveAttemptStatus)(attemptResult.rows[0].status)) {
            return res.status(409).json({
                message: "Attempt already submitted",
            });
        }
        const timerCheck = await (0, timer_service_1.enforceTimeLimit)(normalizedAttemptId);
        if (timerCheck.expired) {
            return res.status(403).json({
                message: "Time expired. Attempt auto-submitted.",
                autoSubmitted: true,
                reason: "TIME_EXPIRED",
            });
        }
        // 2️⃣ Insert violation
        await db_1.default.query(`INSERT INTO violations (attempt_id, violation_type)
       VALUES ($1, $2)`, [normalizedAttemptId, violationType]);
        // 3️⃣ Check auto-submit rules
        const enforcement = await (0, violation_service_1.checkAutoSubmit)(normalizedAttemptId);
        if (enforcement.autoSubmit) {
            const terminalStatuses = ["terminated", "TERMINATED", "submitted", "SUBMITTED", "completed", "COMPLETED"];
            let lastConstraintError = null;
            for (const status of terminalStatuses) {
                try {
                    await db_1.default.query(`UPDATE attempts
             SET status = $2,
                 ${submittedColumn} = NOW()
                 ${hasAutoSubmitted ? ", auto_submitted = true" : ""}
             WHERE id = $1 AND LOWER(status) IN ('started', 'in_progress')`, [normalizedAttemptId, status]);
                    lastConstraintError = null;
                    break;
                }
                catch (error) {
                    if (error?.code === "23514") {
                        lastConstraintError = error;
                        continue;
                    }
                    if (error?.code === "42703") {
                        await db_1.default.query(`UPDATE attempts
               SET status = $2,
                   ${submittedColumn} = NOW()
               WHERE id = $1 AND LOWER(status) IN ('started', 'in_progress')`, [normalizedAttemptId, status]);
                        lastConstraintError = null;
                        break;
                    }
                    throw error;
                }
            }
            if (lastConstraintError) {
                throw lastConstraintError;
            }
            return res.status(200).json({
                message: "Violation logged. Attempt auto-submitted.",
                autoSubmitted: true,
                reason: enforcement.reason,
            });
        }
        return res.status(201).json({
            message: "Violation logged",
            autoSubmitted: false,
        });
    }
    catch (error) {
        console.error("❌ logViolation error:", error);
        if (error?.code === "42703") {
            return res
                .status(500)
                .json({ message: "Database schema mismatch. Please run latest migrations." });
        }
        return res.status(500).json({ message: "Internal server error" });
    }
}
