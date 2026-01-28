import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, ".env") });
import pool from "./src/config/db";

async function testQueries() {
  try {
    console.log("Testing Query 1...");
    const countsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM assessments) as total_assessments,
        (SELECT COUNT(*) FROM users WHERE role = 'CANDIDATE') as total_candidates,
        (SELECT COUNT(*) FROM attempts) as total_attempts,
        (SELECT COUNT(*) FROM attempts WHERE result = 'PASS') as total_pass,
        (SELECT COUNT(*) FROM attempts WHERE result = 'FAIL') as total_fail
    `);
    console.log("Query 1 result:", countsResult.rows[0]);

    console.log("Testing Query 2...");
    const assessmentStatsResult = await pool.query(`
      SELECT 
        a.id,
        a.title,
        COUNT(att.id) as total_attempts,
        COUNT(CASE WHEN att.result = 'PASS' THEN 1 END) as pass_count,
        COUNT(CASE WHEN att.result = 'FAIL' THEN 1 END) as fail_count
      FROM assessments a
      LEFT JOIN attempts att ON a.id = att.assessment_id
      GROUP BY a.id, a.title
    `);
    console.log("Query 2 result count:", assessmentStatsResult.rowCount);

    console.log("Testing Query 3...");
    const recentResultsResult = await pool.query(`
      SELECT 
        att.id,
        u.email,
        u.full_name,
        a.title as assessment_title,
        att.final_score,
        att.result,
        att.start_time
      FROM attempts att
      JOIN users u ON att.user_id = u.id
      JOIN assessments a ON att.assessment_id = a.id
      ORDER BY att.start_time DESC
      LIMIT 10
    `);
    console.log("Query 3 result count:", recentResultsResult.rowCount);

  } catch (err) {
    console.error("❌ Query test failed:", err);
  } finally {
    await pool.end();
  }
}

testQueries();
