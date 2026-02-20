import { Response } from "express";
import pool from "../../config/db";
import { AuthRequest } from "../middlewares/auth.middleware";
import { autoGradeMCQs, calculateFinalScore } from "../../services/scoring.service";
import { calculatePassFail } from "../../services/result.service";
import { isUuid } from "../../utils/validation";
import { isActiveAttemptStatus } from "../../utils/attempt-status";

const QUESTIONS_PER_SECTION = 15;

async function fetchActiveAssessmentById(assessmentId: string) {
  try {
    return await pool.query(
      `SELECT id, duration_minutes, code
       FROM assessments
       WHERE id = $1 AND is_active = true`,
      [assessmentId]
    );
  } catch (error: any) {
    if (error?.code === "42703") {
      return pool.query(
        `SELECT id, duration_minutes, code
         FROM assessments
         WHERE id = $1 AND UPPER(status) = 'ACTIVE'`,
        [assessmentId]
      );
    }
    throw error;
  }
}

async function fetchActiveAssessmentByCode(assessmentCode: string) {
  try {
    return await pool.query(
      `SELECT id, duration_minutes, code
       FROM assessments
       WHERE code = $1 AND is_active = true`,
      [assessmentCode]
    );
  } catch (error: any) {
    if (error?.code === "42703") {
      return pool.query(
        `SELECT id, duration_minutes, code
         FROM assessments
         WHERE code = $1 AND UPPER(status) = 'ACTIVE'`,
        [assessmentCode]
      );
    }
    throw error;
  }
}

let attemptsStartedColumnCache: "started_at" | "start_time" | null = null;
let attemptsSubmittedColumnCache: "submitted_at" | "end_time" | null = null;
let answersTextColumnCache: "answer_text" | "answer" | null = null;

async function getAttemptsStartedColumn() {
  if (attemptsStartedColumnCache) {
    return attemptsStartedColumnCache;
  }

  const startedAt = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'attempts'
       AND column_name = 'started_at'
     LIMIT 1`
  );

  attemptsStartedColumnCache = (startedAt.rowCount ?? 0) > 0 ? "started_at" : "start_time";
  return attemptsStartedColumnCache;
}

async function getAttemptsSubmittedColumn() {
  if (attemptsSubmittedColumnCache) {
    return attemptsSubmittedColumnCache;
  }

  const submittedAt = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'attempts'
       AND column_name = 'submitted_at'
     LIMIT 1`
  );

  attemptsSubmittedColumnCache = (submittedAt.rowCount ?? 0) > 0 ? "submitted_at" : "end_time";
  return attemptsSubmittedColumnCache;
}

async function getAnswersTextColumn() {
  if (answersTextColumnCache) {
    return answersTextColumnCache;
  }

  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1
       FROM pg_attribute
       WHERE attrelid = to_regclass('answers')
         AND attname = 'answer_text'
         AND NOT attisdropped
     ) AS has_answer_text`
  );

  answersTextColumnCache = result.rows[0]?.has_answer_text ? "answer_text" : "answer";
  return answersTextColumnCache;
}

async function createAttemptRecord(userId: string, assessmentId: string) {
  const startedColumn = await getAttemptsStartedColumn();

  try {
    return await pool.query(
      `INSERT INTO attempts (user_id, assessment_id, status, ${startedColumn})
       VALUES ($1, $2, 'started', NOW())
       RETURNING id`,
      [userId, assessmentId]
    );
  } catch (error: any) {
    if (error?.code === "23514") {
      return pool.query(
        `INSERT INTO attempts (user_id, assessment_id, status, ${startedColumn})
         VALUES ($1, $2, 'IN_PROGRESS', NOW())
         RETURNING id`,
        [userId, assessmentId]
      );
    }
    throw error;
  }
}

async function markAttemptCompleted(attemptId: string) {
  const submittedColumn = await getAttemptsSubmittedColumn();
  const statusCandidates = [
    "completed",
    "COMPLETED",
    "submitted",
    "SUBMITTED",
    "terminated",
    "TERMINATED",
  ];

  let lastConstraintError: any = null;
  for (const status of statusCandidates) {
    try {
      return await pool.query(
        `UPDATE attempts
         SET status = $2,
             ${submittedColumn} = NOW()
         WHERE id = $1`,
        [attemptId, status]
      );
    } catch (error: any) {
      if (error?.code === "23514") {
        lastConstraintError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastConstraintError ?? new Error("Unable to set a compatible completed status");
}

async function fetchQuestionsForAttempt(assessmentId: string, attemptId: string) {
  return pool.query(
    `WITH section_questions AS (
       SELECT
         q.id,
         q.question_text,
         q.question_type,
         q.marks,
         q.section,
         CASE
           WHEN LOWER(q.question_type) = 'mcq' THEN (
             CASE
               WHEN jsonb_typeof(q.options::jsonb) = 'object' THEN (
                 SELECT json_agg(json_build_object('id', key, 'text', value))
                 FROM jsonb_each_text(q.options::jsonb) AS t(key, value)
               )
               WHEN jsonb_typeof(q.options::jsonb) = 'array' THEN (
                 SELECT json_agg(
                   json_build_object('id', chr(96 + ordinality::int), 'text', value)
                   ORDER BY ordinality
                 )
                 FROM jsonb_array_elements_text(q.options::jsonb) WITH ORDINALITY AS t(value, ordinality)
               )
               ELSE NULL
             END
           )
           ELSE NULL
         END AS options,
         ROW_NUMBER() OVER (PARTITION BY q.section ORDER BY md5(q.id::text || $2::text)) AS rn
       FROM questions q
       WHERE q.assessment_id = $1
     )
     SELECT id, question_text, question_type, marks, section, options
     FROM section_questions
     WHERE rn <= $3
     ORDER BY
       CASE
         WHEN section = 'Quantitative' THEN 1
         WHEN section = 'Verbal' THEN 2
         WHEN section = 'Coding' THEN 3
         ELSE 4
       END,
       rn`,
    [assessmentId, attemptId, QUESTIONS_PER_SECTION]
  );
}

export async function startAttempt(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { assessmentId, assessmentCode } = req.body as {
      assessmentId?: string;
      assessmentCode?: string;
    };
    const userId = req.user.userId;

    if (!assessmentCode && !assessmentId) {
      return res.status(400).json({ message: "Assessment code or ID is required" });
    }

    let assessmentQuery;
    if (assessmentId) {
      assessmentQuery = await fetchActiveAssessmentById(assessmentId);
    } else {
      assessmentQuery = await fetchActiveAssessmentByCode(String(assessmentCode).toUpperCase());
    }

    if (!assessmentQuery.rowCount) {
      return res.status(404).json({ message: "Assessment not found or inactive" });
    }

    const assessment = assessmentQuery.rows[0];
    if (assessmentCode && assessment.code !== String(assessmentCode).toUpperCase()) {
      return res.status(403).json({ message: "Code mismatch for this assessment" });
    }

    const startedColumn = await getAttemptsStartedColumn();
    const existingAttempt = await pool.query(
      `SELECT id, status
       FROM attempts
       WHERE user_id = $1 AND assessment_id = $2
       ORDER BY ${startedColumn} DESC
       LIMIT 1`,
      [userId, assessment.id]
    );

    if ((existingAttempt.rowCount ?? 0) > 0) {
      const attempt = existingAttempt.rows[0];
      if (isActiveAttemptStatus(attempt.status)) {
        return res.status(409).json({
          message: "An active attempt already exists",
          attemptId: attempt.id,
        });
      }

      return res.status(403).json({
        message: "You have already completed this assessment and cannot retake it.",
      });
    }

    const createdAttempt = await createAttemptRecord(userId, assessment.id);
    const attemptId = createdAttempt.rows[0].id as string;

    const questionsResult = await fetchQuestionsForAttempt(assessment.id, attemptId);
    if (!questionsResult.rowCount) {
      return res.status(500).json({ message: "No questions configured for this assessment" });
    }

    return res.status(201).json({
      message: "Attempt started",
      attemptId,
      durationMinutes: assessment.duration_minutes,
      questions: questionsResult.rows,
    });
  } catch (error) {
    console.error("startAttempt error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function submitAttempt(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { attemptId } = req.body as { attemptId?: string };
    const userId = req.user.userId;

    if (!attemptId) {
      return res.status(400).json({ message: "attemptId is required" });
    }

    if (!isUuid(attemptId)) {
      return res.status(400).json({ message: "Invalid attemptId" });
    }

    const attemptResult = await pool.query(
      `SELECT id, status
       FROM attempts
       WHERE id = $1 AND user_id = $2`,
      [attemptId, userId]
    );

    if (attemptResult.rowCount === 0) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (!isActiveAttemptStatus(attemptResult.rows[0].status)) {
      return res.status(409).json({ message: "Attempt already submitted" });
    }

    await markAttemptCompleted(attemptId);

    await autoGradeMCQs(attemptId);
    const score = await calculateFinalScore(attemptId);
    try {
      await calculatePassFail(attemptId);
    } catch (error: any) {
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
  } catch (error) {
    console.error("submitAttempt error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getQuestions(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const attemptId = req.params.attemptId;
    const userId = req.user.userId;

    if (!attemptId) {
      return res.status(400).json({ message: "Invalid attemptId" });
    }

    if (!isUuid(attemptId)) {
      return res.status(400).json({ message: "Invalid attemptId" });
    }

    const attemptResult = await pool.query(
      `SELECT id, assessment_id, status
       FROM attempts
       WHERE id = $1 AND user_id = $2`,
      [attemptId, userId]
    );

    if (attemptResult.rowCount === 0) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    const assessmentId = attemptResult.rows[0].assessment_id as string;
    const questionsResult = await fetchQuestionsForAttempt(assessmentId, attemptId);
    return res.json(questionsResult.rows);
  } catch (error) {
    console.error("getQuestions error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function saveAnswer(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const attemptId = req.params.attemptId;
    const { questionId: rawQuestionId, answer } = req.body;
    const userId = req.user.userId;
    const questionId = typeof rawQuestionId === "string" ? rawQuestionId.trim() : rawQuestionId;

    if (!attemptId || !questionId || answer === undefined) {
      return res.status(400).json({ message: "Invalid attemptId, questionId or answer" });
    }

    if (!isUuid(attemptId) || !isUuid(questionId)) {
      return res.status(400).json({ message: "Invalid attemptId or questionId" });
    }

    const attemptResult = await pool.query(
      `SELECT id, assessment_id, status
       FROM attempts
       WHERE id = $1 AND user_id = $2`,
      [attemptId, userId]
    );

    if (attemptResult.rowCount === 0) {
      return res.status(404).json({ message: "Active attempt not found or already submitted" });
    }

    if (!isActiveAttemptStatus(attemptResult.rows[0].status)) {
      return res.status(404).json({ message: "Active attempt not found or already submitted" });
    }

    const assessmentId = attemptResult.rows[0].assessment_id as string;
    const questionResult = await pool.query(
      `SELECT id
       FROM questions
       WHERE id = $1 AND assessment_id = $2`,
      [questionId, assessmentId]
    );

    if (questionResult.rowCount === 0) {
      return res.status(400).json({ message: "Question does not belong to this assessment" });
    }

    const answerColumn = await getAnswersTextColumn();
    const updated = await pool.query(
      `UPDATE answers
       SET ${answerColumn} = $3
       WHERE attempt_id = $1 AND question_id = $2
       RETURNING id`,
      [attemptId, questionId, answer]
    );

    if ((updated.rowCount ?? 0) > 0) {
      return res.json({
        message: "Answer saved successfully",
        answerId: updated.rows[0].id,
      });
    }

    const inserted = await pool.query(
      `INSERT INTO answers (attempt_id, question_id, ${answerColumn})
       VALUES ($1, $2, $3)
       RETURNING id`,
      [attemptId, questionId, answer]
    );

    return res.json({
      message: "Answer saved successfully",
      answerId: inserted.rows[0].id,
    });
  } catch (error) {
    console.error("saveAnswer error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
