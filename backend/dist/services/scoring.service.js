"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoGradeMCQs = autoGradeMCQs;
exports.autoGradeDescriptive = autoGradeDescriptive;
exports.calculateFinalScore = calculateFinalScore;
const Answer_1 = __importDefault(require("../models/Answer"));
const Attempt_1 = __importDefault(require("../models/Attempt"));
require("../models/Question");
const STOP_WORDS = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "has",
    "he",
    "in",
    "is",
    "it",
    "its",
    "of",
    "on",
    "or",
    "that",
    "the",
    "to",
    "was",
    "were",
    "will",
    "with",
]);
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function normalizeText(value) {
    return String(value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function tokenize(value) {
    const text = normalizeText(value);
    if (!text)
        return [];
    return text
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}
function extractKeywords(modelAnswer) {
    const raw = String(modelAnswer || "").trim();
    if (!raw)
        return [];
    // If admin provides comma/newline separated rubric keywords, honor that first.
    const hasExplicitSeparators = /[,;\n|]/.test(raw);
    if (hasExplicitSeparators) {
        const items = raw
            .split(/[,;\n|]/g)
            .map((part) => normalizeText(part))
            .filter(Boolean);
        return Array.from(new Set(items.flatMap((item) => tokenize(item))));
    }
    return Array.from(new Set(tokenize(raw)));
}
function gradeByKeywords(params) {
    const { candidateAnswer, modelAnswer, maxMarks } = params;
    if (!candidateAnswer || maxMarks <= 0)
        return 0;
    const expectedKeywords = extractKeywords(modelAnswer);
    if (expectedKeywords.length === 0)
        return null;
    const candidateTokens = new Set(tokenize(candidateAnswer));
    if (candidateTokens.size === 0)
        return 0;
    let hits = 0;
    for (const keyword of expectedKeywords) {
        if (candidateTokens.has(keyword)) {
            hits += 1;
        }
    }
    const ratio = hits / expectedKeywords.length;
    const marks = maxMarks * clamp(ratio, 0, 1);
    return Number(clamp(marks, 0, maxMarks).toFixed(2));
}
function heuristicDescriptiveMarks(params) {
    const { candidateAnswer, modelAnswer, questionText, maxMarks } = params;
    if (!candidateAnswer)
        return 0;
    if (maxMarks <= 0)
        return 0;
    const candidateTokens = new Set(tokenize(candidateAnswer));
    if (candidateTokens.size === 0)
        return 0;
    const referenceText = modelAnswer || questionText;
    const referenceTokens = new Set(tokenize(referenceText));
    if (referenceTokens.size === 0) {
        const words = candidateAnswer.split(/\s+/).filter(Boolean).length;
        if (words >= 90)
            return maxMarks;
        if (words >= 60)
            return Number((maxMarks * 0.8).toFixed(2));
        if (words >= 35)
            return Number((maxMarks * 0.6).toFixed(2));
        if (words >= 15)
            return Number((maxMarks * 0.4).toFixed(2));
        return Number((maxMarks * 0.2).toFixed(2));
    }
    let overlap = 0;
    for (const token of candidateTokens) {
        if (referenceTokens.has(token)) {
            overlap += 1;
        }
    }
    const coverage = overlap / referenceTokens.size;
    const boundedCoverage = clamp(coverage, 0, 1);
    const score = maxMarks * boundedCoverage;
    return Number(clamp(score, 0, maxMarks).toFixed(2));
}
function parseMarksFromModelResponse(raw) {
    const text = String(raw ?? "").trim();
    if (!text)
        return null;
    try {
        const parsed = JSON.parse(text);
        const value = Number(parsed?.marks);
        return Number.isFinite(value) ? value : null;
    }
    catch {
        const jsonLike = text.match(/\{[\s\S]*\}/);
        if (!jsonLike)
            return null;
        try {
            const parsed = JSON.parse(jsonLike[0]);
            const value = Number(parsed?.marks);
            return Number.isFinite(value) ? value : null;
        }
        catch {
            return null;
        }
    }
}
async function gradeWithLLM(params) {
    const { questionText, modelAnswer, candidateAnswer, maxMarks } = params;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey)
        return null;
    const endpoint = process.env.OPENAI_BASE_URL
        ? `${process.env.OPENAI_BASE_URL.replace(/\/$/, "")}/chat/completions`
        : "https://api.openai.com/v1/chat/completions";
    const model = process.env.DESCRIPTIVE_GRADING_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
    const rubric = modelAnswer
        ? `Reference answer / rubric:\n${modelAnswer}`
        : "No reference answer provided. Score by relevance, factual correctness, completeness, and clarity.";
    const prompt = [
        "You are grading a candidate answer for a descriptive assessment question.",
        `Question:\n${questionText}`,
        rubric,
        `Candidate answer:\n${candidateAnswer}`,
        `Maximum marks: ${maxMarks}`,
        'Return strict JSON only: {"marks": number}.',
        "Do not return any explanation.",
    ].join("\n\n");
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                temperature: 0,
                messages: [
                    {
                        role: "system",
                        content: "You are a strict automated grader. Output JSON only.",
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
            }),
        });
        if (!response.ok) {
            return null;
        }
        const payload = (await response.json());
        const content = payload?.choices?.[0]?.message?.content;
        return parseMarksFromModelResponse(content);
    }
    catch {
        return null;
    }
}
async function autoGradeMCQs(attemptId) {
    const answers = await Answer_1.default.find({
        attempt_id: attemptId,
        is_graded: false,
    }).populate({
        path: "question_id",
        match: { question_type: { $in: ["mcq", "MCQ"] } },
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
async function autoGradeDescriptive(attemptId) {
    const answers = await Answer_1.default.find({
        attempt_id: attemptId,
        is_graded: false,
    }).populate({
        path: "question_id",
        match: { question_type: { $in: ["descriptive", "DESCRIPTIVE"] } },
        select: "question_text correct_answer marks",
    });
    let total = 0;
    for (const answer of answers) {
        if (!answer.question_id)
            continue;
        const question = answer.question_id;
        const maxMarks = Number(question?.marks || 0);
        const candidateAnswer = String(answer.answer_text || "").trim();
        const questionText = String(question?.question_text || "");
        const modelAnswer = String(question?.correct_answer || "");
        let marksObtained = 0;
        if (candidateAnswer && maxMarks > 0) {
            const keywordMarks = gradeByKeywords({
                candidateAnswer,
                modelAnswer,
                maxMarks,
            });
            if (keywordMarks !== null && Number.isFinite(keywordMarks)) {
                marksObtained = keywordMarks;
            }
            else {
                marksObtained = heuristicDescriptiveMarks({
                    candidateAnswer,
                    modelAnswer,
                    questionText,
                    maxMarks,
                });
            }
        }
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
