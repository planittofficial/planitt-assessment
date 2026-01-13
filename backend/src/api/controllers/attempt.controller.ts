import { Response } from "express";
import pool from "../../config/db";
import { AuthRequest } from "../middlewares/auth.middleware";
import { autoGradeMCQs, calculateFinalScore } from "../../services/scoring.service";
import { calculatePassFail } from "../../services/result.service";

/**
 * START ATTEMPT
 */
export async function startAttempt(req: AuthRequest, res: Response) {
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
    console.log(`DEBUG: startAttempt - assessmentId: ${assessmentId}, assessmentCode: ${assessmentCode}`);
    if (assessmentId) {
      const result = await pool.query(
        `SELECT id, duration_minutes, code FROM assessments WHERE id = $1 AND status = 'ACTIVE'`,
        [assessmentId]
      );
      console.log(`DEBUG: startAttempt - Query by ID result rowCount: ${result.rowCount}`);
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Assessment not found or is inactive" });
      }
      assessment = result.rows[0];
    } else {
      const result = await pool.query(
        `SELECT id, duration_minutes, code FROM assessments WHERE code = $1 AND status = 'ACTIVE'`,
        [assessmentCode.toUpperCase()]
      );
      console.log(`DEBUG: startAttempt - Query by code result rowCount: ${result.rowCount}`);
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Invalid assessment code or assessment is inactive" });
      }
      assessment = result.rows[0];
    }

    // 2️⃣ Double check code if ID was provided
    if (assessment.code !== assessmentCode.toUpperCase()) {
      return res.status(403).json({ message: "Code mismatch for this assessment" });
    }

    const finalAssessmentId = assessment.id;

    // 3️⃣ Check for any existing attempt (to enforce single attempt policy)
    const existingAttempt = await pool.query(
      `SELECT id, status FROM attempts
       WHERE user_id = $1
         AND assessment_id = $2`,
      [userId, finalAssessmentId]
    );

    if (existingAttempt.rowCount > 0) {
      const attempt = existingAttempt.rows[0];
      if (attempt.status === 'IN_PROGRESS') {
        return res.status(409).json({
          message: "An active attempt already exists",
          attemptId: attempt.id,
        });
      } else {
        return res.status(403).json({
          message: "You have already completed this assessment and cannot retake it.",
        });
      }
    }

    // 4️⃣ Create new attempt
    const attemptResult = await pool.query(
      `INSERT INTO attempts (
         user_id,
         assessment_id,
         status,
         start_time
       )
       VALUES ($1, $2, 'IN_PROGRESS', NOW())
       RETURNING id`,
      [userId, finalAssessmentId]
    );

    const attemptId = attemptResult.rows[0].id;

    // 5️⃣ Fetch assessment questions (60 total: 20 per section, randomized consistently for this attempt)
    let questionsResult;
    try {
      questionsResult = await pool.query(
        `WITH section_questions AS (
           SELECT
             q.id,
             q.question_text,
             q.question_type,
             q.marks,
             q.section,
             CASE WHEN LOWER(q.question_type) = 'mcq' THEN
               (SELECT json_agg(json_build_object('id', key, 'text', value))
                FROM jsonb_each_text(q.options) AS t(key, value))
             ELSE NULL END AS options,
             ROW_NUMBER() OVER (PARTITION BY q.section ORDER BY md5(q.id::text || $2::text)) as rn
           FROM questions q
           WHERE q.assessment_id = $1
         )
         SELECT id, question_text, question_type, marks, section, options
         FROM section_questions
         WHERE rn <= 15
         ORDER BY 
           CASE 
             WHEN section = 'Quantitative' THEN 1
             WHEN section = 'Verbal' THEN 2
             WHEN section = 'Coding' THEN 3
             ELSE 4
           END, rn`,
        [finalAssessmentId, attemptId]
      );
    } catch (dbError: any) {
      console.error("❌ Database error fetching questions:", dbError);
      // If section column is missing, fallback to simple query or return specific error
      if (dbError.code === '42703' && dbError.message.includes('section')) {
        return res.status(500).json({ 
          message: "Database schema mismatch: 'section' column missing. Please run the migration.",
          error: dbError.message 
        });
      }
      throw dbError;
    }

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
  } catch (error) {
    console.error("❌ startAttempt error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * SUBMIT ATTEMPT (MANUAL)
 */
export async function submitAttempt(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { attemptId: rawAttemptId } = req.body;
    const attemptId = Number(rawAttemptId);
    const userId = req.user.userId;

    if (!attemptId || Number.isNaN(attemptId)) {
      return res.status(400).json({ message: "attemptId is required and must be a number" });
    }

    // 1️⃣ Fetch attempt
    const attemptResult = await pool.query(
      `SELECT id, status
       FROM attempts
       WHERE id = $1 AND user_id = $2`,
      [attemptId, userId]
    );

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
    await pool.query(
      `UPDATE attempts
       SET status = 'SUBMITTED',
           end_time = NOW(),
           is_published = false
       WHERE id = $1`,
      [attemptId]
    );

    // 4️⃣ Grade MCQs and calculate final score
    await autoGradeMCQs(attemptId);
    const score = await calculateFinalScore(attemptId);
    
    // 5️⃣ Calculate PASS/FAIL but DON'T return it to candidate yet
    await calculatePassFail(attemptId);

    return res.json({
      message: "Attempt submitted successfully",
      score: score,
    });
  } catch (error) {
    console.error("❌ submitAttempt error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET QUESTIONS FOR ATTEMPT
 */
export async function getQuestions(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const attemptId = Number(req.params.attemptId);
    const userId = req.user.userId;

    if (Number.isNaN(attemptId)) {
      return res.status(400).json({ message: "Invalid attemptId" });
    }

    // 1️⃣ Verify attempt belongs to user
    console.log(`DEBUG: getQuestions - attemptId: ${attemptId}, userId: ${userId}`);
    const attemptResult = await pool.query(
      `SELECT id, assessment_id
       FROM attempts
       WHERE id = $1 AND user_id = $2`,
      [attemptId, userId]
    );

    if (attemptResult.rowCount === 0) {
      console.log(`DEBUG: getQuestions - No attempt found for attemptId: ${attemptId}, userId: ${userId}`);
      return res.status(404).json({ message: "Attempt not found" });
    }

    const assessmentId = attemptResult.rows[0].assessment_id;

    // 2️⃣ Fetch questions (60 total: 20 per section, randomized consistently for this attempt)
    const questionsResult = await pool.query(
      `WITH section_questions AS (
         SELECT
           q.id,
           q.question_text,
           q.question_type,
           q.marks,
           q.section,
           CASE WHEN LOWER(q.question_type) = 'mcq' THEN
             (SELECT json_agg(json_build_object('id', key, 'text', value))
              FROM jsonb_each_text(q.options) AS t(key, value))
           ELSE NULL END AS options,
           ROW_NUMBER() OVER (PARTITION BY q.section ORDER BY md5(q.id::text || $2::text)) as rn
         FROM questions q
         WHERE q.assessment_id = $1
       )
       SELECT id, question_text, question_type, marks, section, options
       FROM section_questions
       WHERE rn <= 20
       ORDER BY 
         CASE 
           WHEN section = 'Quantitative' THEN 1
           WHEN section = 'Verbal' THEN 2
           WHEN section = 'Coding' THEN 3
           ELSE 4
         END, rn`,
      [assessmentId, attemptId]
    );

    return res.json(questionsResult.rows);
  } catch (error) {
    console.error("❌ getQuestions error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * SAVE ANSWER
 */
export async function saveAnswer(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const attemptId = Number(req.params.attemptId);
    const { questionId, answer } = req.body;
    const userId = req.user.userId;

    if (Number.isNaN(attemptId) || !questionId || answer === undefined) {
      return res.status(400).json({ message: "Invalid attemptId, questionId or answer" });
    }

    // 1️⃣ Verify attempt belongs to user and is active
    console.log(`DEBUG: saveAnswer - attemptId: ${attemptId}, questionId: ${questionId}, answer: ${answer}, userId: ${userId}`);
    const attemptResult = await pool.query(
      `SELECT id
       FROM attempts
       WHERE id = $1 AND user_id = $2 AND status = 'IN_PROGRESS'`,
      [attemptId, userId]
    );

    if (attemptResult.rowCount === 0) {
      console.log(`DEBUG: saveAnswer - No active attempt found for attemptId: ${attemptId}, userId: ${userId}`);
      return res.status(404).json({ message: "Active attempt not found or already submitted" });
    }

    // 2️⃣ Insert or update answer
    const insertResult = await pool.query(
      `INSERT INTO answers (attempt_id, question_id, answer)
       VALUES ($1, $2, $3)
       ON CONFLICT (attempt_id, question_id)
       DO UPDATE SET answer = EXCLUDED.answer
       RETURNING id`,
      [attemptId, questionId, answer]
    );
    console.log(`DEBUG: saveAnswer - Insert result:`, insertResult.rows[0]);

    return res.json({ message: "Answer saved successfully", answerId: insertResult.rows[0].id });
  } catch (error) {
    console.error("❌ saveAnswer error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
