"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceTimeLimit = enforceTimeLimit;
const db_1 = __importDefault(require("../config/db"));
const attempt_schema_1 = require("../utils/attempt-schema");
const attempt_status_1 = require("../utils/attempt-status");
/**
 * Checks if an attempt has exceeded its allowed duration.
 * If yes → auto-submit.
 */
async function enforceTimeLimit(attemptId) {
    const startedColumn = await (0, attempt_schema_1.getAttemptsStartedColumn)();
    const submittedColumn = await (0, attempt_schema_1.getAttemptsSubmittedColumn)();
    const hasAutoSubmitted = await (0, attempt_schema_1.hasAttemptsAutoSubmittedColumn)();
    const result = await db_1.default.query(`
    SELECT 
      a.id,
      a.status,
      a.${startedColumn} AS started_at,
      ass.duration_minutes
    FROM attempts a
    JOIN assessments ass ON ass.id = a.assessment_id
    WHERE a.id = $1
    `, [attemptId]);
    if (result.rowCount === 0)
        return { expired: false };
    const attempt = result.rows[0];
    if (!(0, attempt_status_1.isActiveAttemptStatus)(attempt.status)) {
        return { expired: false };
    }
    const startTime = new Date(attempt.started_at).getTime();
    const durationMs = attempt.duration_minutes * 60 * 1000;
    const now = Date.now();
    if (now >= startTime + durationMs) {
        // ⏱️ Time expired → auto-submit
        const terminalStatuses = ["terminated", "TERMINATED", "submitted", "SUBMITTED", "completed", "COMPLETED"];
        let lastConstraintError = null;
        for (const status of terminalStatuses) {
            try {
                await db_1.default.query(`
          UPDATE attempts
          SET status = $2,
              ${submittedColumn} = NOW()
              ${hasAutoSubmitted ? ", auto_submitted = true" : ""}
          WHERE id = $1 AND LOWER(status) IN ('started', 'in_progress')
          `, [attemptId, status]);
                lastConstraintError = null;
                break;
            }
            catch (error) {
                if (error?.code === "23514") {
                    lastConstraintError = error;
                    continue;
                }
                if (error?.code === "42703") {
                    await db_1.default.query(`
            UPDATE attempts
            SET status = $2,
                ${submittedColumn} = NOW()
            WHERE id = $1 AND LOWER(status) IN ('started', 'in_progress')
            `, [attemptId, status]);
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
