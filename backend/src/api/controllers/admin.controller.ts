import { Request, Response } from "express";
import pool from "../../config/db";
import { AuthRequest } from "../middlewares/auth.middleware";
import { calculateFinalScore } from "../../services/scoring.service";
import { finalizeAttemptIfComplete } from "../../services/finalizeAttempt.service";

/**
 * GET /api/admin/assessments
 * List all assessments
 */
export async function getAssessments(req: Request, res: Response) {
  const result = await pool.query(
    `SELECT id, title, status, code, created_at
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
    const { assessmentId } = req.params;
    const result = await pool.query(
      `SELECT id, title, duration_minutes, pass_percentage, status, code, total_marks
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
    const assessmentId = Number(req.params.assessmentId);

    // 🔒 HARD GUARD
    if (!assessmentId || Number.isNaN(assessmentId)) {
      return res.status(400).json({
        message: "Invalid or missing assessmentId",
      });
    }

    const result = await pool.query(
      `SELECT
         a.id,
         a.user_id,
         u.email,
         a.status,
         a.start_time,
         a.end_time,
         a.final_score,
         a.result,
         a.is_published
       FROM attempts a
       JOIN users u ON u.id = a.user_id
       WHERE a.assessment_id = $1
       ORDER BY a.start_time DESC`,
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

  const result = await pool.query(
    `SELECT violation_type, created_at
FROM violations
WHERE attempt_id = $1
ORDER BY created_at ASC
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
  const { attemptId } = req.params;

  const result = await pool.query(
    `SELECT 
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
    const { attemptId } = req.params;

    // 1. Get Attempt Summary
    const attemptResult = await pool.query(
      `SELECT 
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
          ans.answer as user_answer,
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

  const result = await pool.query(
    `
    SELECT 
      a.id,
      q.question_text,
      a.answer,
      q.marks
    FROM answers a
    JOIN questions q ON q.id = a.question_id
    WHERE a.attempt_id = $1
      AND q.question_type = 'DESCRIPTIVE'
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
    const assessmentId = Number(req.params.assessmentId);

    if (!assessmentId || Number.isNaN(assessmentId)) {
      return res.status(400).json({
        message: "Invalid or missing assessmentId",
      });
    }

    // Update all attempts for this assessment that are finalized (have a result) and not yet published
    const result = await pool.query(
      `
      UPDATE attempts
      SET is_published = true
      WHERE assessment_id = $1
        AND result IS NOT NULL
        AND is_published = false
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
    const { title, duration_minutes, total_marks, pass_percentage, code } = req.body;

    if (!title || !duration_minutes) {
      return res.status(400).json({ message: "Title and duration are required" });
    }

    const assessmentCode = code || Math.random().toString(36).substring(2, 8).toUpperCase();

    const result = await pool.query(
      `INSERT INTO assessments (title, duration_minutes, total_marks, pass_percentage, status, code)
       VALUES ($1, $2, $3, $4, 'ACTIVE', $5)
       RETURNING id, code`,
      [title, duration_minutes, total_marks || 0, pass_percentage || 40, assessmentCode]
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
    const { assessmentId } = req.params;
    const { title, duration_minutes, pass_percentage, status } = req.body;

    const result = await pool.query(
      `UPDATE assessments
       SET title = COALESCE($1, title),
           duration_minutes = COALESCE($2, duration_minutes),
           pass_percentage = COALESCE($3, pass_percentage),
           status = COALESCE($4, status)
       WHERE id = $5
       RETURNING id`,
      [title, duration_minutes, pass_percentage, status, assessmentId]
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
    let { question_text, question_type, marks, correct_answer, options } = req.body;

    if (!question_text || !question_type || marks === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // For MCQ, correct_answer should be the key (a, b, c, etc.), not the text
    if (question_type === "MCQ" && Array.isArray(options) && correct_answer) {
      const optionsObj: { [key: string]: string } = {};
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
    const questionResult = await client.query(
      `INSERT INTO questions (assessment_id, question_text, question_type, marks, correct_answer, options)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [assessmentId, question_text, question_type, marks, correct_answer, JSON.stringify(options)]
    );

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
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ addQuestion error:", error);
    res.status(500).json({ message: "Internal server error" });
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
    const questions = req.body; // Array of questions

    if (!Array.isArray(questions)) {
      return res.status(400).json({ message: "Payload must be an array of questions" });
    }

    await client.query("BEGIN");

    for (const q of questions) {
      let { question_text, question_type, marks, correct_answer, options } = q;

      // For MCQ, correct_answer should be the key (a, b, c, etc.), not the text
      if (question_type === "MCQ" && Array.isArray(options) && correct_answer) {
        const optionsObj: { [key: string]: string } = {};
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

      const questionResult = await client.query(
        `INSERT INTO questions (assessment_id, question_text, question_type, marks, correct_answer, options)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [assessmentId, question_text, question_type, marks, correct_answer, JSON.stringify(options)]
      );
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
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ bulkAddQuestions error:", error);
    res.status(500).json({ message: "Internal server error" });
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
    const result = await pool.query(
      `SELECT
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
       ORDER BY q.created_at ASC`,
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

        if (result.rowCount > 0) {
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
        att.start_time
      FROM attempts att
      JOIN users u ON att.user_id = u.id
      JOIN assessments a ON att.assessment_id = a.id
      ORDER BY att.start_time DESC
      LIMIT 10
    `);

    res.json({
      summary: countsResult.rows[0],
      assessmentStats: assessmentStatsResult.rows,
      recentResults: recentResultsResult.rows
    });
  } catch (error) {
    console.error("❌ getDashboardStats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

