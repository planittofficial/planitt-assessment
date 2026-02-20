import { Request, Response } from "express";
import pool from "../../config/db";
import { AuthRequest } from "../middlewares/auth.middleware";
import { finalizeAttemptIfComplete } from "../../services/finalizeAttempt.service";
import { isUuid } from "../../utils/validation";

let hasIsActiveColumnCache: boolean | null = null;
let attemptsStartedColumnCache: "started_at" | "start_time" | null = null;
let attemptsSubmittedColumnCache: "submitted_at" | "end_time" | null = null;
let answersTextColumnCache: "answer_text" | "answer" | null = null;

async function hasIsActiveColumn() {
  if (hasIsActiveColumnCache !== null) {
    return hasIsActiveColumnCache;
  }

  const result = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'assessments'
       AND column_name = 'is_active'
     LIMIT 1`
  );

  hasIsActiveColumnCache = (result.rowCount ?? 0) > 0;
  return hasIsActiveColumnCache;
}

async function getAttemptsStartedColumn() {
  if (attemptsStartedColumnCache) {
    return attemptsStartedColumnCache;
  }

  const result = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'attempts'
       AND column_name = 'started_at'
     LIMIT 1`
  );

  attemptsStartedColumnCache = (result.rowCount ?? 0) > 0 ? "started_at" : "start_time";
  return attemptsStartedColumnCache;
}

async function getAttemptsSubmittedColumn() {
  if (attemptsSubmittedColumnCache) {
    return attemptsSubmittedColumnCache;
  }

  const result = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'attempts'
       AND column_name = 'submitted_at'
     LIMIT 1`
  );

  attemptsSubmittedColumnCache = (result.rowCount ?? 0) > 0 ? "submitted_at" : "end_time";
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

function requireUuidParam(res: Response, name: string, value: unknown) {
  if (!isUuid(value)) {
    res.status(400).json({ message: `Invalid ${name}` });
    return false;
  }

  return true;
}

async function insertQuestionWithCompatibility(
  client: any,
  payload: {
    assessmentId: string;
    questionText: string;
    questionType: string;
    marks: number;
    correctAnswer: string | null;
    options: unknown;
    section: string;
  }
) {
  const sql = `INSERT INTO questions (assessment_id, question_text, question_type, marks, correct_answer, options, section)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               RETURNING id`;

  const lowerType = payload.questionType.toLowerCase();
  const upperType = payload.questionType.toUpperCase();
  const optionsJson =
    typeof payload.options === "undefined" ? null : JSON.stringify(payload.options);
  const savepoint = "insert_question_sp";

  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    const result = await client.query(sql, [
      payload.assessmentId,
      payload.questionText,
      lowerType,
      payload.marks,
      lowerType === "descriptive" ? null : payload.correctAnswer,
      optionsJson,
      payload.section,
    ]);
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
    return result;
  } catch (error: any) {
    // Some legacy DBs enforce uppercase enum/check values for question_type.
    if (error?.code === "23514") {
      await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
      try {
        const result = await client.query(sql, [
          payload.assessmentId,
          payload.questionText,
          upperType,
          payload.marks,
          upperType === "DESCRIPTIVE" ? null : payload.correctAnswer,
          optionsJson,
          payload.section,
        ]);
        await client.query(`RELEASE SAVEPOINT ${savepoint}`);
        return result;
      } catch (retryError) {
        await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        await client.query(`RELEASE SAVEPOINT ${savepoint}`);
        throw retryError;
      }
    }
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
    throw error;
  }
}

const ALLOWED_SECTIONS = new Set(["Quantitative", "Verbal", "Coding", "Logical"]);

function normalizeQuestionType(value: unknown): "mcq" | "descriptive" | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "mcq" || normalized === "descriptive") {
    return normalized;
  }
  return null;
}

function normalizeSection(value: unknown): string | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "quantitative") return "Quantitative";
  if (normalized === "verbal") return "Verbal";
  if (normalized === "coding") return "Coding";
  if (normalized === "logical") return "Logical";
  return null;
}

async function ensureAssessmentExists(client: any, assessmentId: string) {
  const result = await client.query(
    `SELECT 1 FROM assessments WHERE id = $1 LIMIT 1`,
    [assessmentId]
  );
  return (result.rowCount ?? 0) > 0;
}

async function safeRollback(client: any) {
  try {
    await client.query("ROLLBACK");
  } catch (rollbackError) {
    console.error("❌ rollback error:", rollbackError);
  }
}

/**
 * GET /api/admin/assessments
 * List all assessments
 */
export async function getAssessments(req: Request, res: Response) {
  const useIsActive = await hasIsActiveColumn();
  const result = await pool.query(
    `SELECT id, title, ${useIsActive ? "is_active" : "status"} AS status, code, created_at
     FROM assessments
     ORDER BY created_at DESC`
  );

  res.json(result.rows);
}

/**
 * GET /api/admin/assessments/:assessmentId
 */
export async function getAssessmentById(req: Request, res: Response) {
  try {
    const useIsActive = await hasIsActiveColumn();
    const { assessmentId } = req.params;
    if (!requireUuidParam(res, "assessmentId", assessmentId)) {
      return;
    }
    const result = await pool.query(
      `SELECT id, title, duration_minutes, pass_percentage, ${useIsActive ? "is_active" : "status"} AS status, code, total_marks
       FROM assessments
       WHERE id = $1`,
      [assessmentId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ getAssessmentById error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /api/admin/assessments/:assessmentId/attempts
 * List all attempts for an assessment
 */
export async function getAttemptsByAssessment(
  req: AuthRequest,
  res: Response
) {
  try {
    const startedColumn = await getAttemptsStartedColumn();
    const submittedColumn = await getAttemptsSubmittedColumn();
    const assessmentId = req.params.assessmentId;

    // 🔒 HARD GUARD
    if (!assessmentId) {
      return res.status(400).json({
        message: "Invalid or missing assessmentId",
      });
    }
    if (!requireUuidParam(res, "assessmentId", assessmentId)) {
      return;
    }

    const result = await pool.query(
      `SELECT
         a.id,
         a.user_id,
         u.email,
         a.status,
         a.${startedColumn} AS started_at,
         a.${submittedColumn} AS submitted_at,
         a.final_score,
         a.result,
         a.is_published
       FROM attempts a
       JOIN users u ON u.id = a.user_id
       WHERE a.assessment_id = $1
       ORDER BY a.${startedColumn} DESC`,
      [assessmentId]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("❌ getAttemptsByAssessment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /api/admin/attempts/:attemptId/violations
 * View violations for an attempt
 */
export async function getViolationsByAttempt(req: Request, res: Response) {
  const { attemptId } = req.params;
  if (!requireUuidParam(res, "attemptId", attemptId)) {
    return;
  }

  const result = await pool.query(
    `SELECT violation_type, timestamp
FROM violations
WHERE attempt_id = $1
ORDER BY timestamp ASC
`,
    [attemptId]
  );

  res.json(result.rows);
}

/**
 * GET /api/admin/attempts/:attemptId
 * Attempt summary
 */
export async function getAttemptSummary(req: Request, res: Response) {
  const startedColumn = await getAttemptsStartedColumn();
  const submittedColumn = await getAttemptsSubmittedColumn();
  const { attemptId } = req.params;
  if (!requireUuidParam(res, "attemptId", attemptId)) {
    return;
  }

  const result = await pool.query(
    `SELECT 
        a.id,
        u.email,
        a.status,
        a.${startedColumn} AS started_at,
        a.${submittedColumn} AS submitted_at,
        COUNT(v.id) AS violations
     FROM attempts a
     JOIN users u ON u.id = a.user_id
     LEFT JOIN violations v ON v.attempt_id = a.id
     WHERE a.id = $1
     GROUP BY a.id, u.email`,
    [attemptId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ message: "Attempt not found" });
  }

  res.json(result.rows[0]);
}

/**
 * GET /api/admin/attempts/:attemptId/details
 * Detailed attempt result including all answers
 */
export async function getAttemptDetails(req: Request, res: Response) {
  try {
    const startedColumn = await getAttemptsStartedColumn();
    const submittedColumn = await getAttemptsSubmittedColumn();
    const answerColumn = await getAnswersTextColumn();
    const { attemptId } = req.params;
    if (!requireUuidParam(res, "attemptId", attemptId)) {
      return;
    }

    // 1. Get Attempt Summary
    const attemptResult = await pool.query(
      `SELECT 
          a.id,
          u.email,
          a.status,
          a.${startedColumn} AS started_at,
          a.${submittedColumn} AS submitted_at,
          a.final_score,
          a.result,
          ass.title as assessment_title,
          ass.total_marks
       FROM attempts a
       JOIN users u ON u.id = a.user_id
       JOIN assessments ass ON ass.id = a.assessment_id
       WHERE a.id = $1`,
      [attemptId]
    );

    if (attemptResult.rowCount === 0) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    // 2. Get All Answers
    const answersResult = await pool.query(
      `SELECT 
          ans.id as answer_id,
          q.question_text,
          q.question_type,
          q.correct_answer,
          ans.${answerColumn} as user_answer,
          ans.marks_obtained,
          q.marks as max_marks,
          ans.is_graded
       FROM answers ans
       JOIN questions q ON q.id = ans.question_id
       WHERE ans.attempt_id = $1
       ORDER BY q.created_at ASC`,
      [attemptId]
    );

    res.json({
      attempt: attemptResult.rows[0],
      answers: answersResult.rows
    });
  } catch (error) {
    console.error("❌ getAttemptDetails error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
export async function getDescriptiveAnswers(req: Request, res: Response) {
  const { attemptId } = req.params;
  if (!requireUuidParam(res, "attemptId", attemptId)) {
    return;
  }
  const answerColumn = await getAnswersTextColumn();

  const result = await pool.query(
    `
    SELECT 
      a.id,
      q.question_text,
      a.${answerColumn} as answer_text,
      q.marks
    FROM answers a
    JOIN questions q ON q.id = a.question_id
    WHERE a.attempt_id = $1
      AND LOWER(q.question_type) = 'descriptive'
    `,
    [attemptId]
  );

  res.json(result.rows);
}

/**
 * POST /api/admin/grade-answer
 * Grade a descriptive answer and recalculate final score
 */
export async function gradeDescriptiveAnswer(req: Request, res: Response) {
  try {
    const { answerId, marks } = req.body;

    if (!answerId || marks === undefined) {
      return res.status(400).json({ message: "answerId and marks are required" });
    }
    if (!requireUuidParam(res, "answerId", answerId)) {
      return;
    }

    // 1️⃣ Grade the answer
    const result = await pool.query(
      `
      UPDATE answers
      SET marks_obtained = $1,
          is_graded = true
      WHERE id = $2
      RETURNING attempt_id
      `,
      [marks, answerId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Answer not found" });
    }

    const attemptId = result.rows[0].attempt_id;

    // 2️⃣ Auto-finalize if this was the last pending answer
    const finalization = await finalizeAttemptIfComplete(attemptId);

    res.json({
      message: "Answer graded successfully",
      finalized: finalization.finalized,
      result: finalization.result ?? null,
    });
  } catch (error) {
    console.error("❌ gradeDescriptiveAnswer error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function publishResult(req: Request, res: Response) {
  try {
    const { attemptId } = req.params;
    if (!requireUuidParam(res, "attemptId", attemptId)) {
      return;
    }

    // 1️⃣ Ensure attempt exists & is finalized
    const attempt = await pool.query(
      `
      SELECT id, result, is_published
      FROM attempts
      WHERE id = $1
      `,
      [attemptId]
    );

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
    await pool.query(
      `
      UPDATE attempts
      SET is_published = true
      WHERE id = $1
      `,
      [attemptId]
    );

    res.json({
      message: "Result published successfully",
    });
  } catch (error) {
    console.error("❌ publishResult error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function publishAllResults(req: Request, res: Response) {
  try {
    const assessmentId = req.params.assessmentId;

    if (!assessmentId) {
      return res.status(400).json({
        message: "Invalid or missing assessmentId",
      });
    }
    if (!requireUuidParam(res, "assessmentId", assessmentId)) {
      return;
    }

    // Update all attempts for this assessment that are finalized (have a result) and not yet published
    const result = await pool.query(
      `
      UPDATE attempts
      SET is_published = true
      WHERE assessment_id = $1
        AND result IS NOT NULL
        AND COALESCE(is_published, false) = false
      RETURNING id
      `,
      [assessmentId]
    );

    res.json({
      message: `${result.rowCount} results published successfully`,
      count: result.rowCount,
    });
  } catch (error) {
    console.error("❌ publishAllResults error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * POST /api/admin/assessments
 * Create a new assessment
 */
export async function createAssessment(req: Request, res: Response) {
  try {
    const useIsActive = await hasIsActiveColumn();
    const { title, duration_minutes, total_marks, pass_percentage, code } = req.body;

    if (!title || !duration_minutes) {
      return res.status(400).json({ message: "Title and duration are required" });
    }

    const assessmentCode = code || Math.random().toString(36).substring(2, 8).toUpperCase();
    const duration = duration_minutes || 60;

    const result = useIsActive
      ? await pool.query(
          `INSERT INTO assessments (title, duration_minutes, total_marks, pass_percentage, is_active, code)
           VALUES ($1, $2, $3, $4, true, $5)
           RETURNING id, code`,
          [title, duration, total_marks || 0, pass_percentage || 40, assessmentCode]
        )
      : await pool.query(
          `INSERT INTO assessments (title, duration_minutes, total_marks, pass_percentage, status, code)
           VALUES ($1, $2, $3, $4, 'ACTIVE', $5)
           RETURNING id, code`,
          [title, duration, total_marks || 0, pass_percentage || 40, assessmentCode]
        );

    res.status(201).json({
      message: "Assessment created successfully",
      assessmentId: result.rows[0].id,
      code: result.rows[0].code,
    });
  } catch (error) {
    console.error("❌ createAssessment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * PATCH /api/admin/assessments/:assessmentId
 * Update assessment details
 */
export async function updateAssessment(req: Request, res: Response) {
  try {
    const useIsActive = await hasIsActiveColumn();
    const { assessmentId } = req.params;
    if (!requireUuidParam(res, "assessmentId", assessmentId)) {
      return;
    }
    const { title, duration_minutes, pass_percentage, status } = req.body;
    const normalizedBooleanStatus =
      typeof status === "string"
        ? ["active", "true", "1"].includes(status.toLowerCase())
        : typeof status === "boolean"
          ? status
          : null;
    const normalizedTextStatus =
      typeof status === "string"
        ? status.toUpperCase()
        : typeof status === "boolean"
          ? status
            ? "ACTIVE"
            : "INACTIVE"
          : null;

    const result = useIsActive
      ? await pool.query(
          `UPDATE assessments
           SET title = COALESCE($1, title),
               duration_minutes = COALESCE($2, duration_minutes),
               pass_percentage = COALESCE($3, pass_percentage),
               is_active = COALESCE($4, is_active)
           WHERE id = $5
           RETURNING id`,
          [title, duration_minutes, pass_percentage, normalizedBooleanStatus, assessmentId]
        )
      : await pool.query(
          `UPDATE assessments
           SET title = COALESCE($1, title),
               duration_minutes = COALESCE($2, duration_minutes),
               pass_percentage = COALESCE($3, pass_percentage),
               status = COALESCE($4, status)
           WHERE id = $5
           RETURNING id`,
          [title, duration_minutes, pass_percentage, normalizedTextStatus, assessmentId]
        );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    res.json({ message: "Assessment updated successfully" });
  } catch (error) {
    console.error("❌ updateAssessment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * POST /api/admin/assessments/:assessmentId/questions
 * Add a question to an assessment
 */
export async function addQuestion(req: Request, res: Response) {
  const client = await pool.connect();
  try {
    const { assessmentId } = req.params;
    if (!requireUuidParam(res, "assessmentId", assessmentId)) {
      return;
    }
    let { question_text, question_type, marks, correct_answer, options, section } = req.body;

    if (!question_text || !question_type || marks === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const normalizedType = normalizeQuestionType(question_type);
    if (!normalizedType) {
      return res.status(400).json({ message: "question_type must be MCQ or DESCRIPTIVE" });
    }

    const normalizedSection = normalizeSection(section || "Quantitative");
    if (!normalizedSection || !ALLOWED_SECTIONS.has(normalizedSection)) {
      return res.status(400).json({ message: "section must be Quantitative, Verbal, Coding, or Logical" });
    }

    const numericMarks = Number(marks);
    if (!Number.isFinite(numericMarks) || numericMarks <= 0) {
      return res.status(400).json({ message: "marks must be a positive number" });
    }

    // For MCQ, correct_answer MUST be the key (a, b, c, etc.)
    if (String(question_type).toLowerCase() === "mcq" && correct_answer && options) {
      let optionsObj: { [key: string]: string } = {};
      
      if (Array.isArray(options)) {
        const keys = ['a', 'b', 'c', 'd', 'e', 'f'];
        options.forEach((opt, index) => {
          optionsObj[keys[index]] = opt;
        });
        options = optionsObj;
      } else {
        optionsObj = options;
      }

      // If correct_answer is not a key (like 'a'), but a value (like '24'), find the key
      if (!Object.keys(optionsObj).includes(correct_answer)) {
        const correctKey = Object.keys(optionsObj).find(key => optionsObj[key] === correct_answer);
        if (correctKey) {
          correct_answer = correctKey;
        } else {
          return res.status(400).json({ message: "Correct answer not found in options" });
        }
      }
    }

    await client.query("BEGIN");
    const assessmentExists = await ensureAssessmentExists(client, assessmentId);
    if (!assessmentExists) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Assessment not found" });
    }

    // 1. Insert Question
    const questionResult = await insertQuestionWithCompatibility(client, {
      assessmentId,
      questionText: String(question_text),
      questionType: normalizedType,
      marks: numericMarks,
      correctAnswer: normalizedType === "descriptive" ? null : (correct_answer ?? null),
      options: options ?? null,
      section: normalizedSection,
    });

    const questionId = questionResult.rows[0].id;

    // 3. Update Assessment Total Marks
    await client.query(
      `UPDATE assessments
       SET total_marks = (SELECT COALESCE(SUM(marks), 0) FROM questions WHERE assessment_id = $1)
       WHERE id = $1`,
      [assessmentId]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Question added successfully",
      questionId,
    });
  } catch (error: any) {
    await safeRollback(client);
    console.error("❌ addQuestion error:", error);
    if (error?.code === "23503") {
      return res.status(400).json({ message: "Assessment not found" });
    }
    if (error?.code === "23514") {
      return res.status(400).json({ message: "Invalid question_type, section, or marks value" });
    }
    if (error?.code === "22P02") {
      return res.status(400).json({ message: "Invalid question payload format" });
    }
    if (error?.code === "42703") {
      return res.status(500).json({ message: "Database schema mismatch. Please run latest migrations." });
    }
    const devMessage =
      process.env.NODE_ENV !== "production"
        ? `Internal server error (${error?.code || "unknown"}): ${error?.message || "unknown error"}`
        : "Internal server error";
    res.status(500).json({ message: devMessage });
  } finally {
    client.release();
  }
}

/**
 * POST /api/admin/assessments/:assessmentId/questions/bulk
 * Bulk add questions
 */
export async function bulkAddQuestions(req: Request, res: Response) {
  const client = await pool.connect();
  try {
    const { assessmentId } = req.params;
    if (!requireUuidParam(res, "assessmentId", assessmentId)) {
      return;
    }
    const questions = req.body; // Array of questions

    if (!Array.isArray(questions)) {
      return res.status(400).json({ message: "Payload must be an array of questions" });
    }

    await client.query("BEGIN");
    const assessmentExists = await ensureAssessmentExists(client, assessmentId);
    if (!assessmentExists) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Assessment not found" });
    }

    for (const q of questions) {
      let { question_text, question_type, marks, correct_answer, options, section } = q;

      if (!question_text || !question_type || marks === undefined) {
        throw new Error("INVALID_QUESTION_PAYLOAD");
      }

      const numericMarks = Number(marks);
      if (!Number.isFinite(numericMarks) || numericMarks <= 0) {
        throw new Error("INVALID_QUESTION_PAYLOAD");
      }

      const normalizedType = normalizeQuestionType(question_type);
      if (!normalizedType) {
        throw new Error("INVALID_QUESTION_PAYLOAD");
      }

      const normalizedSection = normalizeSection(section || "Quantitative");
      if (!normalizedSection || !ALLOWED_SECTIONS.has(normalizedSection)) {
        throw new Error("INVALID_QUESTION_PAYLOAD");
      }

      // For MCQ, correct_answer MUST be the key (a, b, c, etc.)
      if (String(question_type).toLowerCase() === "mcq" && correct_answer && options) {
        let optionsObj: { [key: string]: string } = {};
        
        if (Array.isArray(options)) {
          const keys = ['a', 'b', 'c', 'd', 'e', 'f'];
          options.forEach((opt, index) => {
            optionsObj[keys[index]] = opt;
          });
          options = optionsObj;
        } else {
          optionsObj = options;
        }

        // If correct_answer is not a key (like 'a'), but a value (like '24'), find the key
        if (!Object.keys(optionsObj).includes(correct_answer)) {
          const correctKey = Object.keys(optionsObj).find(key => optionsObj[key] === correct_answer);
          if (correctKey) {
            correct_answer = correctKey;
          } else {
            // If still not found, we might have an issue, but we'll try to proceed or throw
            console.warn(`Warning: Correct answer "${correct_answer}" not found in options for question: ${question_text}`);
          }
        }
      }

      await insertQuestionWithCompatibility(client, {
        assessmentId,
        questionText: String(question_text),
        questionType: normalizedType,
        marks: numericMarks,
        correctAnswer: normalizedType === "descriptive" ? null : (correct_answer ?? null),
        options: options ?? null,
        section: normalizedSection,
      });
    }

    // Update Assessment Total Marks
    await client.query(
      `UPDATE assessments
       SET total_marks = (SELECT COALESCE(SUM(marks), 0) FROM questions WHERE assessment_id = $1)
       WHERE id = $1`,
      [assessmentId]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: `${questions.length} questions added successfully`,
    });
  } catch (error: any) {
    await safeRollback(client);
    console.error("❌ bulkAddQuestions error:", error);
    if (error?.message === "INVALID_QUESTION_PAYLOAD") {
      return res.status(400).json({ message: "One or more questions have invalid required fields" });
    }
    if (error?.code === "23503") {
      return res.status(400).json({ message: "Assessment not found" });
    }
    if (error?.code === "22P02") {
      return res.status(400).json({ message: "Invalid question payload format" });
    }
    if (error?.code === "23514") {
      return res.status(400).json({ message: "One or more questions have invalid question_type, section, or marks" });
    }
    if (error?.code === "42703") {
      return res.status(500).json({ message: "Database schema mismatch. Please run latest migrations." });
    }
    const devMessage =
      process.env.NODE_ENV !== "production"
        ? `Internal server error (${error?.code || "unknown"}): ${error?.message || "unknown error"}`
        : "Internal server error";
    res.status(500).json({ message: devMessage });
  } finally {
    client.release();
  }
}

/**
 * GET /api/admin/assessments/:assessmentId/questions
 */
export async function getAssessmentQuestions(req: Request, res: Response) {
  try {
    const { assessmentId } = req.params;
    if (!requireUuidParam(res, "assessmentId", assessmentId)) {
      return;
    }
    const result = await pool.query(
      `SELECT
         q.id,
         q.question_text,
         q.question_type,
         q.marks,
         q.correct_answer,
         q.section,
         CASE
           WHEN LOWER(q.question_type) = 'mcq' THEN
             (
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
         END AS options
       FROM questions q
       WHERE q.assessment_id = $1
       ORDER BY q.section ASC, q.created_at ASC`,
      [assessmentId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("❌ getAssessmentQuestions error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * DELETE /api/admin/assessments/:assessmentId/questions/:questionId
 */
export async function deleteQuestion(req: Request, res: Response) {
  try {
    const { assessmentId, questionId } = req.params;
    if (!requireUuidParam(res, "assessmentId", assessmentId)) {
      return;
    }
    if (!requireUuidParam(res, "questionId", questionId)) {
      return;
    }

    // 1️⃣ Verify question belongs to assessment
    const questionResult = await pool.query(
      `SELECT id FROM questions
       WHERE id = $1 AND assessment_id = $2`,
      [questionId, assessmentId]
    );

    if (questionResult.rowCount === 0) {
      return res.status(404).json({ message: "Question not found in this assessment" });
    }

    // 2️⃣ Delete the question (CASCADE will handle related answers)
    await pool.query(
      `DELETE FROM questions WHERE id = $1`,
      [questionId]
    );

    // 3️⃣ Update assessment total marks
    await pool.query(
      `UPDATE assessments
       SET total_marks = (SELECT COALESCE(SUM(marks), 0) FROM questions WHERE assessment_id = $1)
       WHERE id = $1`,
      [assessmentId]
    );

    res.json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error("❌ deleteQuestion error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * DELETE /api/admin/assessments/:assessmentId/questions
 * Delete all questions for an assessment
 */
export async function deleteAllQuestions(req: Request, res: Response) {
  try {
    const { assessmentId } = req.params;
    if (!requireUuidParam(res, "assessmentId", assessmentId)) {
      return;
    }

    // 1️⃣ Delete all questions
    await pool.query(
      `DELETE FROM questions WHERE assessment_id = $1`,
      [assessmentId]
    );

    // 2️⃣ Reset assessment total marks
    await pool.query(
      `UPDATE assessments
       SET total_marks = 0
       WHERE id = $1`,
      [assessmentId]
    );

    res.json({ message: "All questions deleted successfully" });
  } catch (error) {
    console.error("❌ deleteAllQuestions error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /api/admin/candidates
 */
export async function getCandidates(req: Request, res: Response) {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, created_at
       FROM users
       WHERE role = 'CANDIDATE'
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("❌ getCandidates error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * POST /api/admin/candidates
 */
export async function addCandidate(req: Request, res: Response) {
  try {
    const { email, full_name } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const result = await pool.query(
      `INSERT INTO users (email, full_name, role)
       VALUES ($1, $2, 'CANDIDATE')
       RETURNING id`,
      [email, full_name || '']
    );

    res.status(201).json({
      message: "Candidate added successfully",
      candidateId: result.rows[0].id,
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ message: "Candidate already exists" });
    }
    console.error("❌ addCandidate error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * POST /api/admin/candidates/bulk
 */
export async function bulkAddCandidates(req: Request, res: Response) {
  const client = await pool.connect();
  try {
    const { candidates } = req.body;

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ message: "Invalid or empty candidates list" });
    }

    await client.query("BEGIN");

    const insertedIds = [];
    let skipCount = 0;

    for (const candidate of candidates) {
      const { email, full_name } = candidate;
      if (!email) continue;

      try {
        const result = await client.query(
          `INSERT INTO users (email, full_name, role)
           VALUES ($1, $2, 'CANDIDATE')
           ON CONFLICT (email) DO NOTHING
           RETURNING id`,
          [email, full_name || ""]
        );

        if ((result.rowCount ?? 0) > 0) {
          insertedIds.push(result.rows[0].id);
        } else {
          skipCount++;
        }
      } catch (err) {
        console.error(`❌ Error inserting candidate ${email}:`, err);
        // Continue with other candidates
      }
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Bulk upload completed",
      insertedCount: insertedIds.length,
      skippedCount: skipCount,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ bulkAddCandidates error:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
}

/**
 * GET /api/admin/dashboard-stats
 */
export async function getDashboardStats(req: Request, res: Response) {
  try {
    const startedColumn = await getAttemptsStartedColumn();
    // 1. Total counts
    const countsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM assessments) as total_assessments,
        (SELECT COUNT(*) FROM users WHERE role = 'CANDIDATE') as total_candidates,
        (SELECT COUNT(*) FROM attempts) as total_attempts,
        (SELECT COUNT(*) FROM attempts WHERE result = 'PASS') as total_pass,
        (SELECT COUNT(*) FROM attempts WHERE result = 'FAIL') as total_fail
    `);

    // 2. Performance by assessment
    const assessmentStatsResult = await pool.query(`
      SELECT 
        a.id,
        a.title,
        COUNT(att.id) as total_attempts,
        COUNT(CASE WHEN att.result = 'PASS' THEN 1 END) as pass_count,
        COUNT(CASE WHEN att.result = 'FAIL' THEN 1 END) as fail_count
      FROM assessments a
      LEFT JOIN attempts att ON a.id = att.assessment_id
      GROUP BY a.id, a.title
    `);

    // 3. Recent results (last 10)
    const recentResultsResult = await pool.query(`
      SELECT 
        att.id,
        u.email,
        u.full_name,
        a.title as assessment_title,
        att.final_score,
        att.result,
        att.${startedColumn} as started_at
      FROM attempts att
      JOIN users u ON att.user_id = u.id
      JOIN assessments a ON att.assessment_id = a.id
      ORDER BY att.${startedColumn} DESC
      LIMIT 10
    `);

    res.json({
      summary: countsResult.rows[0],
      assessmentStats: assessmentStatsResult.rows,
      recentResults: recentResultsResult.rows
    });
  } catch (error: any) {
    console.error("❌ getDashboardStats error:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

/**
 * DELETE /api/admin/candidates/:id
 */
export async function deleteCandidate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!requireUuidParam(res, "id", id)) {
      return;
    }
    await pool.query("DELETE FROM users WHERE id = $1 AND role = 'CANDIDATE'", [id]);
    res.json({ message: "Candidate deleted successfully" });
  } catch (error) {
    console.error("❌ deleteCandidate error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * DELETE /api/admin/candidates/bulk-delete
 */
export async function bulkDeleteCandidates(req: Request, res: Response) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Invalid or empty ID list" });
    }
    if (!ids.every(isUuid)) {
      return res.status(400).json({ message: "Invalid ID list" });
    }

    await pool.query("DELETE FROM users WHERE id = ANY($1) AND role = 'CANDIDATE'", [ids]);
    res.json({ message: "Candidates deleted successfully" });
  } catch (error) {
    console.error("❌ bulkDeleteCandidates error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
