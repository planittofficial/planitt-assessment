import pool from "../config/db";

export async function checkAutoSubmit(attemptId: string) {
  const result = await pool.query(
    `SELECT violation_type, COUNT(*) as count
     FROM violations
     WHERE attempt_id = $1
     GROUP BY violation_type`,
    [attemptId]
  );

  const totalViolations = result.rows.reduce(
    (total, row) => total + Number(row.count),
    0
  );

  for (const row of result.rows) {
    if (row.violation_type === "AUTO_TYPER_DETECTED") {
      return { autoSubmit: true, reason: "AUTO_TYPER_DETECTED", totalViolations };
    }
  }

  // Auto-submit once total violations reach 3.
  if (totalViolations >= 3) {
    return { autoSubmit: true, reason: "TOTAL_VIOLATION_LIMIT", totalViolations };
  }

  return { autoSubmit: false, totalViolations };
}
