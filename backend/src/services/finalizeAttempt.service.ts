import pool from "../config/db";
import { calculatePassFail } from "./result.service";

/**
 * Finalizes an attempt if all answers are graded
 */
export async function finalizeAttemptIfComplete(attemptId: string) {
  // 1️⃣ Check for ungraded answers
  const pending = await pool.query(
    `
    SELECT COUNT(*) AS remaining
    FROM answers
    WHERE attempt_id = $1
      AND is_graded = false
    `,
    [attemptId]
  );

  const remaining = Number(pending.rows[0].remaining);

  if (remaining > 0) {
    // Still waiting for grading
    return { finalized: false };
  }

  // 2️⃣ Recalculate final score (safety)
  await pool.query(
    `
    UPDATE attempts
    SET final_score = (
      SELECT COALESCE(SUM(marks_obtained), 0)
      FROM answers
      WHERE attempt_id = $1
    )
    WHERE id = $1
    `,
    [attemptId]
  );

  // 3️⃣ Calculate PASS / FAIL
  const result = await calculatePassFail(attemptId);

  return {
    finalized: true,
    result: result.result,
    percentage: result.percentage,
  };
}

