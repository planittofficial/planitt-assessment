"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePassFail = calculatePassFail;
exports.setManualResultOverride = setManualResultOverride;
exports.recalculateAssessmentResults = recalculateAssessmentResults;
const Attempt_1 = __importDefault(require("../models/Attempt"));
require("../models/Assessment");
function normalizeResult(value) {
    const normalized = String(value || "").trim().toUpperCase();
    if (normalized === "PASS" || normalized === "FAIL") {
        return normalized;
    }
    return null;
}
/**
 * Calculates PASS / FAIL for an attempt.
 * Manual overrides are preserved unless explicitly cleared first.
 */
async function calculatePassFail(attemptId) {
    const attempt = await Attempt_1.default.findById(attemptId).populate({
        path: "assessment_id",
        select: "total_marks pass_percentage",
    });
    if (!attempt) {
        throw new Error("Attempt not found for result calculation");
    }
    const manualResult = normalizeResult(attempt.result_override);
    if (manualResult) {
        await Attempt_1.default.findByIdAndUpdate(attemptId, {
            result: manualResult,
        });
        return {
            percentage: null,
            result: manualResult,
            source: "manual",
        };
    }
    const assessment = attempt.assessment_id;
    const totalMarks = assessment?.total_marks;
    const passPercentage = assessment?.pass_percentage;
    if (totalMarks === 0) {
        throw new Error("Assessment total_marks cannot be zero");
    }
    const percentage = ((attempt.final_score || 0) / totalMarks) * 100;
    const status = percentage >= passPercentage ? "PASS" : "FAIL";
    await Attempt_1.default.findByIdAndUpdate(attemptId, {
        result: status,
    });
    return {
        percentage,
        result: status,
        source: "criteria",
    };
}
async function setManualResultOverride(attemptId, result) {
    const update = result === null
        ? { result_override: null }
        : { result_override: result, result };
    const attempt = await Attempt_1.default.findByIdAndUpdate(attemptId, update, { new: true });
    if (!attempt) {
        throw new Error("Attempt not found");
    }
    if (result === null) {
        return calculatePassFail(attemptId);
    }
    return {
        percentage: null,
        result,
        source: "manual",
    };
}
async function recalculateAssessmentResults(assessmentId) {
    const attempts = await Attempt_1.default.find({
        assessment_id: assessmentId,
        final_score: { $ne: null },
    }).select("_id");
    let recalculated = 0;
    let skippedManual = 0;
    for (const attempt of attempts) {
        const current = await Attempt_1.default.findById(attempt._id).select("result_override");
        const manualResult = normalizeResult(current?.result_override);
        if (manualResult) {
            skippedManual += 1;
            continue;
        }
        await calculatePassFail(String(attempt._id));
        recalculated += 1;
    }
    return {
        recalculated,
        skippedManual,
        total: attempts.length,
    };
}
