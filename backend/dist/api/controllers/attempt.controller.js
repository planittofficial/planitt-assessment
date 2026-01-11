"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAttempt = startAttempt;
exports.submitAttempt = submitAttempt;
const db_1 = __importDefault(require("../../config/db"));
/**
 * START ATTEMPT
 */
async function startAttempt(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { assessmentId, assessmentCode } = req.body;
        const userId = req.user.userId;
        if (!assessmentCode) {
            return res.status(400).json({ message: "Assessment code is required" });
        }
        // 1️⃣ Validate assessment
        let assessment;
        if (assessmentId) {
            const result = await db_1.default.query(`SELECT id, duration_minutes, code FROM assessments WHERE id = $1 AND status = 'ACTIVE'`, [assessmentId]);
            if (result.rowCount === 0) {
                return res.status(404).json({ message: "Assessment not found or inactive" });
            }
            assessment = result.rows[0];
        }
        else {
            const result = await db_1.default.query(`SELECT id, duration_minutes, code FROM assessments WHERE code = $1 AND status = 'ACTIVE'`, [assessmentCode.toUpperCase()]);
            if (result.rowCount === 0) {
                return res.status(404).json({ message: "Invalid assessment code" });
            }
            assessment = result.rows[0];
        }
        // 2️⃣ Double check code if ID was provided
        if (assessment.code !== assessmentCode.toUpperCase()) {
            return res.status(403).json({ message: "Invalid assessment code" });
        }
        const finalAssessmentId = assessment.id;
        // 3️⃣ Check existing active attempt
        const activeAttempt = await db_1.default.query(`SELECT id FROM attempts
       WHERE user_id = $1
         AND assessment_id = $2
         AND status = 'IN_PROGRESS'`, [userId, finalAssessmentId]);
        if (activeAttempt.rowCount > 0) {
            return res.status(409).json({
                message: "An active attempt already exists",
                attemptId: activeAttempt.rows[0].id,
            });
        }
        // 4️⃣ Create new attempt
        const attemptResult = await db_1.default.query(`INSERT INTO attempts (
         user_id,
         assessment_id,
         status,
         start_time
       )
       VALUES ($1, $2, 'IN_PROGRESS', NOW())
       RETURNING id`, [userId, finalAssessmentId]);
        const attemptId = attemptResult.rows[0].id;
        // 5️⃣ Fetch assessment questions (NO correct answers)
        const questionsResult = await db_1.default.query(`SELECT
         q.id,
         q.question_text,
         q.question_type,
         q.marks,
         CASE WHEN q.question_type = 'mcq' THEN
           (SELECT json_agg(json_build_object('id', key, 'text', value)) FROM jsonb_each(q.options))
         ELSE NULL END AS options
       FROM questions q
       WHERE q.assessment_id = $1
       ORDER BY q.created_at ASC`, [finalAssessmentId]);
        if (questionsResult.rowCount === 0) {
            return res.status(500).json({
                message: "No questions configured for this assessment",
            });
        }
        // 5️⃣ Return everything frontend needs
        return res.status(201).json({
            message: "Attempt started",
            attemptId,
            durationMinutes: assessment.duration_minutes,
            questions: questionsResult.rows,
        });
    }
    catch (error) {
        console.error("❌ startAttempt error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
/**
 * SUBMIT ATTEMPT (MANUAL)
 */
async function submitAttempt(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { attemptId } = req.body;
        const userId = req.user.userId;
        if (!attemptId) {
            return res.status(400).json({ message: "attemptId is required" });
        }
        // 1️⃣ Fetch attempt
        const attemptResult = await db_1.default.query(`SELECT id, status
       FROM attempts
       WHERE id = $1 AND user_id = $2`, [attemptId, userId]);
        if (attemptResult.rowCount === 0) {
            return res.status(404).json({ message: "Attempt not found" });
        }
        const attempt = attemptResult.rows[0];
        // 2️⃣ Ensure attempt is active
        if (attempt.status !== "IN_PROGRESS") {
            return res.status(409).json({
                message: "Attempt already submitted",
            });
        }
        // 3️⃣ Submit attempt
        await db_1.default.query(`UPDATE attempts
       SET status = 'SUBMITTED',
           end_time = NOW()
       WHERE id = $1`, [attemptId]);
        return res.json({
            message: "Attempt submitted successfully",
        });
    }
    catch (error) {
        console.error("❌ submitAttempt error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
