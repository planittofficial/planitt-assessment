"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceTimeLimit = enforceTimeLimit;
const Attempt_1 = __importDefault(require("../models/Attempt"));
const attempt_status_1 = require("../utils/attempt-status");
/**
 * Checks if an attempt has exceeded its allowed duration.
 * If yes → auto-submit.
 */
async function enforceTimeLimit(attemptId) {
    const attempt = await Attempt_1.default.findById(attemptId).populate({
        path: "assessment_id",
        select: "duration_minutes",
    });
    if (!attempt)
        return { expired: false };
    if (!(0, attempt_status_1.isActiveAttemptStatus)(attempt.status)) {
        return { expired: false };
    }
    const assessment = attempt.assessment_id;
    const durationMinutes = assessment?.duration_minutes;
    const startTime = new Date(attempt.started_at).getTime();
    const durationMs = durationMinutes * 60 * 1000;
    const now = Date.now();
    if (now >= startTime + durationMs) {
        await Attempt_1.default.findByIdAndUpdate(attemptId, {
            status: "terminated",
            submitted_at: new Date(),
            auto_submitted: true,
        });
        return { expired: true };
    }
    return { expired: false };
}
