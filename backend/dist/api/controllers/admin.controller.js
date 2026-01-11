"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssessments = getAssessments;
exports.getAttemptsByAssessment = getAttemptsByAssessment;
exports.getViolationsByAttempt = getViolationsByAttempt;
exports.getAttemptSummary = getAttemptSummary;
exports.getAttemptDetails = getAttemptDetails;
exports.getDescriptiveAnswers = getDescriptiveAnswers;
exports.gradeDescriptiveAnswer = gradeDescriptiveAnswer;
exports.publishResult = publishResult;
exports.createAssessment = createAssessment;
exports.addQuestion = addQuestion;
exports.bulkAddQuestions = bulkAddQuestions;
exports.getAssessmentQuestions = getAssessmentQuestions;
const db_1 = __importDefault(require("../../config/db"));
const finalizeAttempt_service_1 = require("../../services/finalizeAttempt.service");
/**
 * GET /api/admin/assessments
 * List all assessments
 */
async function getAssessments(req, res) {
    const result = await db_1.default.query(`SELECT id, title, status, code, created_at
     FROM assessments
     ORDER BY created_at DESC`);
    res.json(result.rows);
}
/**
 * GET /api/admin/assessments/:assessmentId/attempts
 * List all attempts for an assessment
 */
async function getAttemptsByAssessment(req, res) {
    try {
        const assessmentId = Number(req.params.assessmentId);
        // 🔒 HARD GUARD
        if (!assessmentId || Number.isNaN(assessmentId)) {
            return res.status(400).json({
                message: "Invalid or missing assessmentId",
            });
        }
        const result = await db_1.default.query(`SELECT
         a.id,
         a.user_id,
         u.email,
         a.status,
         a.start_time,
         a.end_time,
         a.final_score,
         a.result
       FROM attempts a
       JOIN users u ON u.id = a.user_id
       WHERE a.assessment_id = $1
       ORDER BY a.start_time DESC`, [assessmentId]);
        return res.json(result.rows);
    }
    catch (error) {
        console.error("❌ getAttemptsByAssessment error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
/**
 * GET /api/admin/attempts/:attemptId/violations
 * View violations for an attempt
 */
async function getViolationsByAttempt(req, res) {
    const { attemptId } = req.params;
    const result = await db_1.default.query(`SELECT violation_type, created_at
FROM violations
WHERE attempt_id = $1
ORDER BY created_at ASC
`, [attemptId]);
    res.json(result.rows);
}
/**
 * GET /api/admin/attempts/:attemptId
 * Attempt summary
 */
async function getAttemptSummary(req, res) {
    const { attemptId } = req.params;
    const result = await db_1.default.query(`SELECT 
        a.id,
        u.email,
        a.status,
        a.start_time,
        a.end_time,
        COUNT(v.id) AS violations
     FROM attempts a
     JOIN users u ON u.id = a.user_id
     LEFT JOIN violations v ON v.attempt_id = a.id
     WHERE a.id = $1
     GROUP BY a.id, u.email`, [attemptId]);
    if (result.rowCount === 0) {
        return res.status(404).json({ message: "Attempt not found" });
    }
    res.json(result.rows[0]);
}
/**
 * GET /api/admin/attempts/:attemptId/details
 * Detailed attempt result including all answers
 */
async function getAttemptDetails(req, res) {
    try {
        const { attemptId } = req.params;
        // 1. Get Attempt Summary
        const attemptResult = await db_1.default.query(`SELECT 
          a.id,
          u.email,
          a.status,
          a.start_time,
          a.end_time,
          a.final_score,
          a.result,
          ass.title as assessment_title,
          ass.total_marks
       FROM attempts a
       JOIN users u ON u.id = a.user_id
       JOIN assessments ass ON ass.id = a.assessment_id
       WHERE a.id = $1`, [attemptId]);
        if (attemptResult.rowCount === 0) {
            return res.status(404).json({ message: "Attempt not found" });
        }
        // 2. Get All Answers
        const answersResult = await db_1.default.query(`SELECT 
          ans.id as answer_id,
          q.question_text,
          q.question_type,
          q.correct_answer,
          ans.answer as user_answer,
          ans.marks_obtained,
          q.marks as max_marks,
          ans.is_graded
       FROM answers ans
       JOIN questions q ON q.id = ans.question_id
       WHERE ans.attempt_id = $1
       ORDER BY q.created_at ASC`, [attemptId]);
        res.json({
            attempt: attemptResult.rows[0],
            answers: answersResult.rows
        });
    }
    catch (error) {
        console.error("❌ getAttemptDetails error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
async function getDescriptiveAnswers(req, res) {
    const { attemptId } = req.params;
    const result = await db_1.default.query(`
    SELECT 
      a.id,
      q.question_text,
      a.answer,
      q.marks
    FROM answers a
    JOIN questions q ON q.id = a.question_id
    WHERE a.attempt_id = $1
      AND q.question_type = 'DESCRIPTIVE'
    `, [attemptId]);
    res.json(result.rows);
}
/**
 * POST /api/admin/grade-answer
 * Grade a descriptive answer and recalculate final score
 */
async function gradeDescriptiveAnswer(req, res) {
    try {
        const { answerId, marks } = req.body;
        if (!answerId || marks === undefined) {
            return res.status(400).json({ message: "answerId and marks are required" });
        }
        // 1️⃣ Grade the answer
        const result = await db_1.default.query(`
      UPDATE answers
      SET marks_obtained = $1,
          is_graded = true
      WHERE id = $2
      RETURNING attempt_id
      `, [marks, answerId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Answer not found" });
        }
        const attemptId = result.rows[0].attempt_id;
        // 2️⃣ Auto-finalize if this was the last pending answer
        const finalization = await (0, finalizeAttempt_service_1.finalizeAttemptIfComplete)(attemptId);
        res.json({
            message: "Answer graded successfully",
            finalized: finalization.finalized,
            result: finalization.result ?? null,
        });
    }
    catch (error) {
        console.error("❌ gradeDescriptiveAnswer error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
async function publishResult(req, res) {
    try {
        const { attemptId } = req.params;
        // 1️⃣ Ensure attempt exists & is finalized
        const attempt = await db_1.default.query(`
      SELECT id, result, is_published
      FROM attempts
      WHERE id = $1
      `, [attemptId]);
        if (attempt.rowCount === 0) {
            return res.status(404).json({ message: "Attempt not found" });
        }
        const row = attempt.rows[0];
        if (!row.result) {
            return res.status(409).json({
                message: "Attempt not finalized yet",
            });
        }
        if (row.is_published) {
            return res.status(409).json({
                message: "Result already published",
            });
        }
        // 2️⃣ Publish result
        await db_1.default.query(`
      UPDATE attempts
      SET is_published = true
      WHERE id = $1
      `, [attemptId]);
        res.json({
            message: "Result published successfully",
        });
    }
    catch (error) {
        console.error("❌ publishResult error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
/**
 * POST /api/admin/assessments
 * Create a new assessment
 */
async function createAssessment(req, res) {
    try {
        const { title, duration_minutes, total_marks, pass_percentage, code } = req.body;
        if (!title || !duration_minutes) {
            return res.status(400).json({ message: "Title and duration are required" });
        }
        const assessmentCode = code || Math.random().toString(36).substring(2, 8).toUpperCase();
        const result = await db_1.default.query(`INSERT INTO assessments (title, duration_minutes, total_marks, pass_percentage, status, code)
       VALUES ($1, $2, $3, $4, 'ACTIVE', $5)
       RETURNING id, code`, [title, duration_minutes, total_marks || 0, pass_percentage || 40, assessmentCode]);
        res.status(201).json({
            message: "Assessment created successfully",
            assessmentId: result.rows[0].id,
            code: result.rows[0].code,
        });
    }
    catch (error) {
        console.error("❌ createAssessment error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
/**
 * POST /api/admin/assessments/:assessmentId/questions
 * Add a question to an assessment
 */
async function addQuestion(req, res) {
    const client = await db_1.default.connect();
    try {
        const { assessmentId } = req.params;
        let { question_text, question_type, marks, correct_answer, options } = req.body;
        if (!question_text || !question_type || marks === undefined) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        // For MCQ, correct_answer should be the key (a, b, c, etc.), not the text
        if (question_type === "MCQ" && Array.isArray(options) && correct_answer) {
            const optionsObj = {};
            const keys = ['a', 'b', 'c', 'd', 'e', 'f'];
            options.forEach((opt, index) => {
                optionsObj[keys[index]] = opt;
            });
            options = optionsObj;
            // Find the key for the correct answer text
            const correctKey = Object.keys(optionsObj).find(key => optionsObj[key] === correct_answer);
            if (!correctKey) {
                return res.status(400).json({ message: "Correct answer not found in options" });
            }
            correct_answer = correctKey;
        }
        await client.query("BEGIN");
        // 1. Insert Question
        const questionResult = await client.query(`INSERT INTO questions (assessment_id, question_text, question_type, marks, correct_answer, options)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`, [assessmentId, question_text, question_type, marks, correct_answer, JSON.stringify(options)]);
        const questionId = questionResult.rows[0].id;
        // 3. Update Assessment Total Marks
        await client.query(`UPDATE assessments
       SET total_marks = (SELECT SUM(marks) FROM questions WHERE assessment_id = $1)
       WHERE id = $1`, [assessmentId]);
        await client.query("COMMIT");
        res.status(201).json({
            message: "Question added successfully",
            questionId,
        });
    }
    catch (error) {
        await client.query("ROLLBACK");
        console.error("❌ addQuestion error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
    finally {
        client.release();
    }
}
/**
 * POST /api/admin/assessments/:assessmentId/questions/bulk
 * Bulk add questions
 */
async function bulkAddQuestions(req, res) {
    const client = await db_1.default.connect();
    try {
        const { assessmentId } = req.params;
        const questions = req.body; // Array of questions
        if (!Array.isArray(questions)) {
            return res.status(400).json({ message: "Payload must be an array of questions" });
        }
        await client.query("BEGIN");
        for (const q of questions) {
            let { question_text, question_type, marks, correct_answer, options } = q;
            // For MCQ, correct_answer should be the key (a, b, c, etc.), not the text
            if (question_type === "MCQ" && Array.isArray(options) && correct_answer) {
                const optionsObj = {};
                const keys = ['a', 'b', 'c', 'd', 'e', 'f'];
                options.forEach((opt, index) => {
                    optionsObj[keys[index]] = opt;
                });
                options = optionsObj;
                // Find the key for the correct answer text
                const correctKey = Object.keys(optionsObj).find(key => optionsObj[key] === correct_answer);
                if (!correctKey) {
                    throw new Error("Correct answer not found in options");
                }
                correct_answer = correctKey;
            }
            const questionResult = await client.query(`INSERT INTO questions (assessment_id, question_text, question_type, marks, correct_answer, options)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`, [assessmentId, question_text, question_type, marks, correct_answer, JSON.stringify(options)]);
        }
        // Update Assessment Total Marks
        await client.query(`UPDATE assessments
       SET total_marks = (SELECT SUM(marks) FROM questions WHERE assessment_id = $1)
       WHERE id = $1`, [assessmentId]);
        await client.query("COMMIT");
        res.status(201).json({
            message: `${questions.length} questions added successfully`,
        });
    }
    catch (error) {
        await client.query("ROLLBACK");
        console.error("❌ bulkAddQuestions error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
    finally {
        client.release();
    }
}
/**
 * GET /api/admin/assessments/:assessmentId/questions
 */
async function getAssessmentQuestions(req, res) {
    try {
        const { assessmentId } = req.params;
        const result = await db_1.default.query(`SELECT
         q.id,
         q.question_text,
         q.question_type,
         q.marks,
         q.correct_answer,
         CASE
           WHEN q.question_type = 'mcq' THEN
             (SELECT json_agg(json_build_object('id', key, 'text', value))
              FROM jsonb_each_text(q.options) AS t(key, value))
           ELSE NULL
         END AS options
       FROM questions q
       WHERE q.assessment_id = $1
       ORDER BY q.created_at ASC`, [assessmentId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error("❌ getAssessmentQuestions error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
