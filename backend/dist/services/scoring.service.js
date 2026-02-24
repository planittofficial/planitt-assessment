"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoGradeMCQs = autoGradeMCQs;
exports.calculateFinalScore = calculateFinalScore;
const Answer_1 = __importDefault(require("../models/Answer"));
const Attempt_1 = __importDefault(require("../models/Attempt"));
async function autoGradeMCQs(attemptId) {
    const answers = await Answer_1.default.find({
        attempt_id: attemptId,
        is_graded: false,
    }).populate({
        path: "question_id",
        match: { question_type: "mcq" },
        select: "correct_answer marks",
    });
    let total = 0;
    for (const answer of answers) {
        if (!answer.question_id)
            continue;
        const question = answer.question_id;
        const isCorrect = answer.answer_text === question.correct_answer;
        const marksObtained = isCorrect ? Number(question.marks) : 0;
        total += marksObtained;
        await Answer_1.default.findByIdAndUpdate(answer._id, {
            marks_obtained: marksObtained,
            is_graded: true,
        });
    }
    return total;
}
async function calculateFinalScore(attemptId) {
    const answers = await Answer_1.default.find({ attempt_id: attemptId });
    const score = answers.reduce((sum, a) => sum + (a.marks_obtained || 0), 0);
    await Attempt_1.default.findByIdAndUpdate(attemptId, {
        final_score: score,
    });
    return score;
}
