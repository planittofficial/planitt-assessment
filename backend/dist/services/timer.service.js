"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceTimeLimit = enforceTimeLimit;
const Attempt_1 = __importDefault(require("../models/Attempt"));
const attempt_status_1 = require("../utils/attempt-status");
const scoring_service_1 = require("./scoring.service");
const result_service_1 = require("./result.service");
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
        await (0, scoring_service_1.autoGradeMCQs)(attemptId);
        await (0, scoring_service_1.autoGradeDescriptive)(attemptId);
        await (0, scoring_service_1.calculateFinalScore)(attemptId);
        try {
            await (0, result_service_1.calculatePassFail)(attemptId);
        }
        catch {
            // Keep timer auto-submit resilient even if pass/fail config is incomplete.
        }
        return { expired: true };
    }
    return { expired: false };
}
