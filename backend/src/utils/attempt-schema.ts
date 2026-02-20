import pool from "../config/db";

let attemptsStartedColumnCache: "started_at" | "start_time" | null = null;
let attemptsSubmittedColumnCache: "submitted_at" | "end_time" | null = null;
let attemptsHasAutoSubmittedCache: boolean | null = null;

export async function getAttemptsStartedColumn() {
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

export async function getAttemptsSubmittedColumn() {
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

export async function hasAttemptsAutoSubmittedColumn() {
  if (attemptsHasAutoSubmittedCache !== null) {
    return attemptsHasAutoSubmittedCache;
  }

  const result = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'attempts'
       AND column_name = 'auto_submitted'
     LIMIT 1`
  );

  attemptsHasAutoSubmittedCache = (result.rowCount ?? 0) > 0;
  return attemptsHasAutoSubmittedCache;
}
