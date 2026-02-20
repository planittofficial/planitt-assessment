import pool from "../config/db";
import {
  getAttemptsStartedColumn,
  getAttemptsSubmittedColumn,
  hasAttemptsAutoSubmittedColumn,
} from "../utils/attempt-schema";
import { isActiveAttemptStatus } from "../utils/attempt-status";

/**
 * Checks if an attempt has exceeded its allowed duration.
 * If yes → auto-submit.
 */
export async function enforceTimeLimit(attemptId: string) {
  const startedColumn = await getAttemptsStartedColumn();
  const submittedColumn = await getAttemptsSubmittedColumn();
  const hasAutoSubmitted = await hasAttemptsAutoSubmittedColumn();

  const result = await pool.query(
    `
    SELECT 
      a.id,
      a.status,
      a.${startedColumn} AS started_at,
      ass.duration_minutes
    FROM attempts a
    JOIN assessments ass ON ass.id = a.assessment_id
    WHERE a.id = $1
    `,
    [attemptId]
  );

  if (result.rowCount === 0) return { expired: false };

  const attempt = result.rows[0];

  if (!isActiveAttemptStatus(attempt.status)) {
    return { expired: false };
  }

  const startTime = new Date(attempt.started_at).getTime();
  const durationMs = attempt.duration_minutes * 60 * 1000;
  const now = Date.now();

  if (now >= startTime + durationMs) {
    // ⏱️ Time expired → auto-submit
    const terminalStatuses = ["terminated", "TERMINATED", "submitted", "SUBMITTED", "completed", "COMPLETED"];
    let lastConstraintError: any = null;

    for (const status of terminalStatuses) {
      try {
        await pool.query(
          `
          UPDATE attempts
          SET status = $2,
              ${submittedColumn} = NOW()
              ${hasAutoSubmitted ? ", auto_submitted = true" : ""}
          WHERE id = $1 AND LOWER(status) IN ('started', 'in_progress')
          `,
          [attemptId, status]
        );
        lastConstraintError = null;
        break;
      } catch (error: any) {
        if (error?.code === "23514") {
          lastConstraintError = error;
          continue;
        }
        if (error?.code === "42703") {
          await pool.query(
            `
            UPDATE attempts
            SET status = $2,
                ${submittedColumn} = NOW()
            WHERE id = $1 AND LOWER(status) IN ('started', 'in_progress')
            `,
            [attemptId, status]
          );
          lastConstraintError = null;
          break;
        }
        throw error;
      }
    }

    if (lastConstraintError) {
      throw lastConstraintError;
    }

    return { expired: true };
  }

  return { expired: false };
}
