"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePassFail = calculatePassFail;
const db_1 = __importDefault(require("../config/db"));
/**
 * Calculates PASS / FAIL for an attempt
 * Must be called AFTER final_score is set
 */
async function calculatePassFail(attemptId) {
    const result = await db_1.default.query(`
    SELECT 
      a.final_score,
      ass.total_marks,
      ass.pass_percentage
    FROM attempts a
    JOIN assessments ass ON ass.id = a.assessment_id
    WHERE a.id = $1
    `, [attemptId]);
    if (result.rowCount === 0) {
        throw new Error("Attempt not found for result calculation");
    }
    const { final_score, total_marks, pass_percentage } = result.rows[0];
    if (total_marks === 0) {
        throw new Error("Assessment total_marks cannot be zero");
    }
    const percentage = (final_score / total_marks) * 100;
    const status = percentage >= pass_percentage ? "PASS" : "FAIL";
    await db_1.default.query(`UPDATE attempts SET result = $1 WHERE id = $2`, [status, attemptId]);
    return {
        percentage,
        result: status,
    };
}
