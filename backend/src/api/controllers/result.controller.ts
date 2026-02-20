import { Request, Response } from "express";
import pool from "../../config/db";
import { AuthRequest } from "../middlewares/auth.middleware";
import { getAttemptsSubmittedColumn } from "../../utils/attempt-schema";

export async function getMyResults(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const submittedColumn = await getAttemptsSubmittedColumn();

    const result = await pool.query(
      `
      SELECT
        a.id AS attempt_id,
        ass.title,
        CASE WHEN COALESCE(a.is_published, false) THEN a.final_score ELSE NULL END AS final_score,
        ass.total_marks,
        CASE WHEN COALESCE(a.is_published, false) THEN a.result ELSE NULL END AS result,
        COALESCE(a.is_published, false) AS is_published,
        a.${submittedColumn} AS submitted_at
      FROM attempts a
      JOIN assessments ass ON ass.id = a.assessment_id
      WHERE a.user_id = $1
      ORDER BY a.${submittedColumn} DESC
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("❌ getMyResults error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
