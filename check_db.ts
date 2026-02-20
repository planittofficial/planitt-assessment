import pool from "./backend/src/config/db";

async function checkDatabase() {
  try {
    // Check assessments
    const assessments = await pool.query('SELECT * FROM assessments');
    console.log('Assessments:', JSON.stringify(assessments.rows, null, 2));

    // Check questions
    const questions = await pool.query('SELECT * FROM questions');
    console.log('Questions:', JSON.stringify(questions.rows, null, 2));

    // Check users
    const users = await pool.query('SELECT id, email, role FROM users');
    console.log('Users:', JSON.stringify(users.rows, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase();
