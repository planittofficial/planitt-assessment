"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeAttemptIfComplete = finalizeAttemptIfComplete;
const Answer_1 = __importDefault(require("../models/Answer"));
const Attempt_1 = __importDefault(require("../models/Attempt"));
const result_service_1 = require("./result.service");
/**
 * Finalizes an attempt if all answers are graded
 */
async function finalizeAttemptIfComplete(attemptId) {
    const pending = await Answer_1.default.countDocuments({
        attempt_id: attemptId,
        is_graded: false,
    });
    if (pending > 0) {
        return { finalized: false };
    }
    const answers = await Answer_1.default.find({ attempt_id: attemptId });
    const totalScore = answers.reduce((sum, a) => sum + (a.marks_obtained || 0), 0);
    await Attempt_1.default.findByIdAndUpdate(attemptId, {
        final_score: totalScore,
    });
    const result = await (0, result_service_1.calculatePassFail)(attemptId);
    return {
        finalized: true,
        result: result.result,
        percentage: result.percentage,
    };
}
