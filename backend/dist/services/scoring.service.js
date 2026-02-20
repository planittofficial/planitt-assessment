"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoGradeMCQs = autoGradeMCQs;
exports.calculateFinalScore = calculateFinalScore;
const db_1 = __importDefault(require("../config/db"));
let answersTextColumnCache = null;
async function getAnswersTextColumn() {
    if (answersTextColumnCache) {
        return answersTextColumnCache;
    }
    const result = await db_1.default.query(`SELECT EXISTS (
       SELECT 1
       FROM pg_attribute
       WHERE attrelid = to_regclass('answers')
         AND attname = 'answer_text'
         AND NOT attisdropped
     ) AS has_answer_text`);
    answersTextColumnCache = result.rows[0]?.has_answer_text ? "answer_text" : "answer";
    return answersTextColumnCache;
}
async function autoGradeMCQs(attemptId) {
    const answerColumn = await getAnswersTextColumn();
    const result = await db_1.default.query(`
    SELECT 
      a.id AS answer_id,
      q.correct_answer,
      q.marks,
      a.${answerColumn} AS candidate_answer
    FROM answers a
    JOIN questions q ON q.id = a.question_id
    WHERE a.attempt_id = $1
      AND LOWER(q.question_type) = 'mcq'
      AND a.is_graded = false
    `, [attemptId]);
    let total = 0;
    for (const row of result.rows) {
        const isCorrect = row.candidate_answer === row.correct_answer;
        const marksObtained = isCorrect ? Number(row.marks) : 0;
        total += marksObtained;
        await db_1.default.query(`
      UPDATE answers
      SET marks_obtained = $1,
          is_graded = true
      WHERE id = $2
      `, [marksObtained, row.answer_id]);
    }
    return total;
}
async function calculateFinalScore(attemptId) {
    const result = await db_1.default.query(`
    SELECT COALESCE(SUM(marks_obtained), 0) AS score
    FROM answers
    WHERE attempt_id = $1
    `, [attemptId]);
    const score = Number(result.rows[0].score);
    await db_1.default.query(`
    UPDATE attempts
    SET final_score = $1
    WHERE id = $2
    `, [score, attemptId]);
    return score;
}
