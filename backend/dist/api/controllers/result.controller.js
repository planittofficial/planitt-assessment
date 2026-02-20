"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyResults = getMyResults;
const db_1 = __importDefault(require("../../config/db"));
const attempt_schema_1 = require("../../utils/attempt-schema");
async function getMyResults(req, res) {
    try {
        const userId = req.user.userId;
        const submittedColumn = await (0, attempt_schema_1.getAttemptsSubmittedColumn)();
        const result = await db_1.default.query(`
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
      `, [userId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error("❌ getMyResults error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
