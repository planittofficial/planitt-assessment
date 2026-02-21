import { Response } from "express";
import pool from "../../config/db";
import { AuthRequest } from "../middlewares/auth.middleware";
import { checkAutoSubmit } from "../../services/violation.service";
import { enforceTimeLimit } from "../../services/timer.service";
import { isUuid } from "../../utils/validation";
import { isActiveAttemptStatus } from "../../utils/attempt-status";
import {
  getAttemptsSubmittedColumn,
  hasAttemptsAutoSubmittedColumn,
} from "../../utils/attempt-schema";


export async function logViolation(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { attemptId, violationType } = req.body;
    const userId = req.user.userId;
    const submittedColumn = await getAttemptsSubmittedColumn();
    const hasAutoSubmitted = await hasAttemptsAutoSubmittedColumn();

    if (!attemptId || !violationType) {
      return res.status(400).json({
        message: "attemptId and violationType are required",
      });
    }

    if (!isUuid(attemptId)) {
      return res.status(400).json({ message: "Invalid attemptId" });
    }
    const normalizedAttemptId = String(attemptId);

    // 1️⃣ Validate attempt ownership
    const attemptResult = await pool.query(
      `SELECT status FROM attempts
       WHERE id = $1 AND user_id = $2`,
      [normalizedAttemptId, userId]
    );

    if (attemptResult.rowCount === 0) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (!isActiveAttemptStatus(attemptResult.rows[0].status)) {
      return res.status(409).json({
        message: "Attempt already submitted",
      });
    }
    
const timerCheck = await enforceTimeLimit(normalizedAttemptId);

if (timerCheck.expired) {
  return res.status(403).json({
    message: "Time expired. Attempt auto-submitted.",
    autoSubmitted: true,
    reason: "TIME_EXPIRED",
  });
}

    // 2️⃣ Insert violation
    await pool.query(
      `INSERT INTO violations (attempt_id, violation_type)
       VALUES ($1, $2)`,
      [normalizedAttemptId, violationType]
    );

    // 3️⃣ Check auto-submit rules
    const enforcement = await checkAutoSubmit(normalizedAttemptId);

    if (enforcement.autoSubmit) {
      const terminalStatuses = ["terminated", "TERMINATED", "submitted", "SUBMITTED", "completed", "COMPLETED"];
      let lastConstraintError: any = null;

      for (const status of terminalStatuses) {
        try {
          await pool.query(
            `UPDATE attempts
             SET status = $2,
                 ${submittedColumn} = NOW()
                 ${hasAutoSubmitted ? ", auto_submitted = true" : ""},
                 result = 'FAIL'
             WHERE id = $1 AND LOWER(status) IN ('started', 'in_progress')`,
            [normalizedAttemptId, status]
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
              `UPDATE attempts
               SET status = $2,
                   ${submittedColumn} = NOW(),
                   result = 'FAIL'
               WHERE id = $1 AND LOWER(status) IN ('started', 'in_progress')`,
              [normalizedAttemptId, status]
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

      return res.status(200).json({
        message: "Violation logged. Attempt auto-submitted.",
        autoSubmitted: true,
        reason: enforcement.reason,
        violationCount: enforcement.totalViolations,
      });
    }

    return res.status(201).json({
      message: "Violation logged",
      autoSubmitted: false,
      violationCount: enforcement.totalViolations,
    });
  } catch (error) {
    console.error("❌ logViolation error:", error);
    if ((error as any)?.code === "42703") {
      return res
        .status(500)
        .json({ message: "Database schema mismatch. Please run latest migrations." });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getViolationCount(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { attemptId } = req.params;
    const userId = req.user.userId;

    if (!attemptId) {
      return res.status(400).json({ message: "attemptId is required" });
    }

    if (!isUuid(attemptId)) {
      return res.status(400).json({ message: "Invalid attemptId" });
    }

    const attemptResult = await pool.query(
      `SELECT id FROM attempts WHERE id = $1 AND user_id = $2`,
      [attemptId, userId]
    );

    if (attemptResult.rowCount === 0) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS violation_count
       FROM violations
       WHERE attempt_id = $1`,
      [attemptId]
    );

    return res.status(200).json({
      attemptId,
      violationCount: Number(countResult.rows[0]?.violation_count || 0),
    });
  } catch (error) {
    console.error("getViolationCount error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
