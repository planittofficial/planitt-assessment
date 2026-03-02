"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAttempt = startAttempt;
exports.submitAttempt = submitAttempt;
exports.getQuestions = getQuestions;
exports.saveAnswer = saveAnswer;
const Attempt_1 = __importDefault(require("../../models/Attempt"));
const Assessment_1 = __importDefault(require("../../models/Assessment"));
const Question_1 = __importDefault(require("../../models/Question"));
const Answer_1 = __importDefault(require("../../models/Answer"));
const scoring_service_1 = require("../../services/scoring.service");
const result_service_1 = require("../../services/result.service");
const attempt_status_1 = require("../../utils/attempt-status");
const device_1 = require("../../utils/device");
const mongoose_1 = __importDefault(require("mongoose"));
const crypto_1 = __importDefault(require("crypto"));
const QUESTIONS_PER_SECTION = 15;
async function fetchActiveAssessmentById(assessmentId) {
    return Assessment_1.default.findOne({
        _id: assessmentId,
        is_active: true,
    }).select("id duration_minutes code");
}
async function fetchActiveAssessmentByCode(assessmentCode) {
    return Assessment_1.default.findOne({
        code: assessmentCode.toUpperCase(),
        is_active: true,
    }).select("id duration_minutes code");
}
function hashForShuffle(id, attemptId) {
    const combined = id + attemptId;
    const hash = crypto_1.default.createHash("md5").update(combined).digest("hex");
    return parseInt(hash.substring(0, 8), 16);
}
async function fetchQuestionsForAttempt(assessmentId, attemptId) {
    const questions = await Question_1.default.find({
        assessment_id: assessmentId,
    }).lean();
    const sections = ["Quantitative", "Verbal", "Coding", "Logical"];
    const questionsBySection = {
        Quantitative: [],
        Verbal: [],
        Coding: [],
        Logical: [],
    };
    for (const question of questions) {
        const section = question.section || "Logical";
        if (questionsBySection[section]) {
            questionsBySection[section].push(question);
        }
    }
    const result = [];
    for (const section of sections) {
        let sectionQuestions = questionsBySection[section] || [];
        sectionQuestions.sort((a, b) => {
            const hashA = hashForShuffle(a._id.toString(), attemptId);
            const hashB = hashForShuffle(b._id.toString(), attemptId);
            return hashA - hashB;
        });
        sectionQuestions = sectionQuestions.slice(0, QUESTIONS_PER_SECTION);
        for (const q of sectionQuestions) {
            const formattedQuestion = {
                id: q._id,
                question_text: q.question_text,
                question_type: q.question_type,
                marks: q.marks,
                section: q.section,
            };
            if (q.question_type === "mcq" && q.options) {
                if (Array.isArray(q.options)) {
                    formattedQuestion.options = q.options.map((text, idx) => ({
                        id: String.fromCharCode(97 + idx),
                        text,
                    }));
                }
                else if (typeof q.options === "object") {
                    formattedQuestion.options = Object.entries(q.options).map(([key, value]) => ({
                        id: key,
                        text: value,
                    }));
                }
            }
            result.push(formattedQuestion);
        }
    }
    return result;
}
async function createAttemptRecord(userId, assessmentId) {
    const attempt = new Attempt_1.default({
        user_id: userId,
        assessment_id: assessmentId,
        status: "started",
        started_at: new Date(),
    });
    await attempt.save();
    return attempt;
}
async function markAttemptCompleted(attemptId) {
    return Attempt_1.default.findByIdAndUpdate(attemptId, {
        status: "completed",
        submitted_at: new Date(),
    }, { new: true });
}
function ensureDesktopOnly(req, res) {
    if (!(0, device_1.isMobileOrTabletRequest)(req))
        return true;
    res.status(403).json({
        message: "Assessment is allowed only on desktop or laptop browsers. Mobile and tablet devices are not permitted.",
        reason: "MOBILE_DEVICE_NOT_ALLOWED",
    });
    return false;
}
async function startAttempt(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!ensureDesktopOnly(req, res))
            return;
        const { assessmentId, assessmentCode } = req.body;
        const userId = req.user.userId;
        if (!assessmentCode && !assessmentId) {
            return res.status(400).json({ message: "Assessment code or ID is required" });
        }
        let assessment;
        if (assessmentId) {
            if (!mongoose_1.default.Types.ObjectId.isValid(assessmentId)) {
                return res.status(400).json({ message: "Invalid assessment ID" });
            }
            assessment = await fetchActiveAssessmentById(assessmentId);
        }
        else {
            assessment = await fetchActiveAssessmentByCode(String(assessmentCode).toUpperCase());
        }
        if (!assessment) {
            return res.status(404).json({ message: "Assessment not found or inactive" });
        }
        if (assessmentCode && assessment.code !== String(assessmentCode).toUpperCase()) {
            return res.status(403).json({ message: "Code mismatch for this assessment" });
        }
        const existingAttempt = await Attempt_1.default.findOne({
            user_id: userId,
            assessment_id: assessment._id,
        }).sort({ started_at: -1 });
        if (existingAttempt) {
            if ((0, attempt_status_1.isActiveAttemptStatus)(existingAttempt.status)) {
                return res.status(409).json({
                    message: "An active attempt already exists",
                    attemptId: existingAttempt._id,
                });
            }
            return res.status(403).json({
                message: "You have already completed this assessment and cannot retake it.",
            });
        }
        const attempt = await createAttemptRecord(userId, assessment._id.toString());
        const questions = await fetchQuestionsForAttempt(assessment._id.toString(), attempt._id.toString());
        if (questions.length === 0) {
            return res
                .status(500)
                .json({ message: "No questions configured for this assessment" });
        }
        return res.status(201).json({
            message: "Attempt started",
            attemptId: attempt._id,
            durationMinutes: assessment.duration_minutes,
            questions,
        });
    }
    catch (error) {
        console.error("startAttempt error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
async function submitAttempt(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!ensureDesktopOnly(req, res))
            return;
        const { attemptId } = req.body;
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
        if (!(0, attempt_status_1.isActiveAttemptStatus)(attempt.status)) {
            return res.status(409).json({ message: "Attempt already submitted" });
        }
        await markAttemptCompleted(attemptId);
        await (0, scoring_service_1.autoGradeMCQs)(attemptId);
        await (0, scoring_service_1.autoGradeDescriptive)(attemptId);
        const score = await (0, scoring_service_1.calculateFinalScore)(attemptId);
        try {
            await (0, result_service_1.calculatePassFail)(attemptId);
        }
        catch (error) {
            if (String(error?.message || "").includes("total_marks cannot be zero")) {
                return res.status(409).json({
                    message: "Assessment scoring is not configured yet. Please contact administrator.",
                });
            }
            throw error;
        }
        return res.json({
            message: "Attempt submitted successfully",
            score,
        });
    }
    catch (error) {
        console.error("submitAttempt error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
async function getQuestions(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!ensureDesktopOnly(req, res))
            return;
        const attemptId = req.params.attemptId;
        const userId = req.user.userId;
        if (!attemptId) {
            return res.status(400).json({ message: "Invalid attemptId" });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(attemptId)) {
            return res.status(400).json({ message: "Invalid attemptId" });
        }
        const attempt = await Attempt_1.default.findOne({
            _id: attemptId,
            user_id: userId,
        }).select("assessment_id status");
        if (!attempt) {
            return res.status(404).json({ message: "Attempt not found" });
        }
        const questions = await fetchQuestionsForAttempt(attempt.assessment_id.toString(), attemptId);
        return res.json(questions);
    }
    catch (error) {
        console.error("getQuestions error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
async function saveAnswer(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!ensureDesktopOnly(req, res))
            return;
        const attemptId = req.params.attemptId;
        const { questionId: rawQuestionId, answer } = req.body;
        const userId = req.user.userId;
        const questionId = typeof rawQuestionId === "string" ? rawQuestionId.trim() : rawQuestionId;
        if (!attemptId || !questionId || answer === undefined) {
            return res
                .status(400)
                .json({ message: "Invalid attemptId, questionId or answer" });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(attemptId) ||
            !mongoose_1.default.Types.ObjectId.isValid(questionId)) {
            return res.status(400).json({ message: "Invalid attemptId or questionId" });
        }
        const attempt = await Attempt_1.default.findOne({
            _id: attemptId,
            user_id: userId,
        }).select("assessment_id status");
        if (!attempt) {
            return res
                .status(404)
                .json({ message: "Active attempt not found or already submitted" });
        }
        if (!(0, attempt_status_1.isActiveAttemptStatus)(attempt.status)) {
            return res
                .status(404)
                .json({ message: "Active attempt not found or already submitted" });
        }
        const question = await Question_1.default.findOne({
            _id: questionId,
            assessment_id: attempt.assessment_id,
        }).select("_id");
        if (!question) {
            return res
                .status(400)
                .json({ message: "Question does not belong to this assessment" });
        }
        let answerRecord = await Answer_1.default.findOne({
            attempt_id: attemptId,
            question_id: questionId,
        });
        if (answerRecord) {
            answerRecord.answer_text = answer;
            await answerRecord.save();
            return res.json({
                message: "Answer saved successfully",
                answerId: answerRecord._id,
            });
        }
        const newAnswer = await Answer_1.default.create({
            attempt_id: attemptId,
            question_id: questionId,
            answer_text: answer,
        });
        return res.json({
            message: "Answer saved successfully",
            answerId: newAnswer._id,
        });
    }
    catch (error) {
        console.error("saveAnswer error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
