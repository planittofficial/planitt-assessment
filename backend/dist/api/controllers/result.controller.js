"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyResults = getMyResults;
const Attempt_1 = __importDefault(require("../../models/Attempt"));
async function getMyResults(req, res) {
    try {
        const userId = req.user.userId;
        const attempts = await Attempt_1.default.find({ user_id: userId })
            .populate({
            path: "assessment_id",
            select: "title total_marks",
        })
            .sort({ submitted_at: -1 });
        const results = attempts.map((attempt) => ({
            attempt_id: attempt._id,
            title: attempt.assessment_id?.title,
            final_score: attempt.is_published ? attempt.final_score : null,
            total_marks: attempt.assessment_id?.total_marks,
            result: attempt.is_published ? attempt.result : null,
            is_published: attempt.is_published,
            submitted_at: attempt.submitted_at,
        }));
        res.json(results);
    }
    catch (error) {
        console.error("❌ getMyResults error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
