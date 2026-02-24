"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePassFail = calculatePassFail;
const Attempt_1 = __importDefault(require("../models/Attempt"));
/**
 * Calculates PASS / FAIL for an attempt
 * Must be called AFTER final_score is set
 */
async function calculatePassFail(attemptId) {
    const attempt = await Attempt_1.default.findById(attemptId).populate({
        path: "assessment_id",
        select: "total_marks pass_percentage",
    });
    if (!attempt) {
        throw new Error("Attempt not found for result calculation");
    }
    const assessment = attempt.assessment_id;
    const total_marks = assessment?.total_marks;
    const pass_percentage = assessment?.pass_percentage;
    if (total_marks === 0) {
        throw new Error("Assessment total_marks cannot be zero");
    }
    const percentage = ((attempt.final_score || 0) / total_marks) * 100;
    const status = percentage >= pass_percentage ? "PASS" : "FAIL";
    await Attempt_1.default.findByIdAndUpdate(attemptId, {
        result: status,
    });
    return {
        percentage,
        result: status,
    };
}
