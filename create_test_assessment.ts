import dotenv from "dotenv";
import pool from "./backend/src/config/db";

dotenv.config();

async function createTestAssessment() {
  try {
    console.log("Creating test assessment...");

    // Insert test assessment
    const result = await pool.query(
      `INSERT INTO assessments (creator_id, title, description, duration_minutes, total_marks, pass_percentage, is_active, code)
       VALUES (
         (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1),
         'Test Assessment',
         'A test assessment for development',
         60,
         100,
         40,
         true,
         'TEST123'
       )
       RETURNING id, code, is_active`,
    );

    console.log("Test assessment created:", result.rows[0]);

    // Insert some test questions
    const questions = [
      {
        text: "What is 2 + 2?",
        type: "mcq",
        options: { a: "3", b: "4", c: "5", d: "6" },
        correct: "b",
        section: "Quantitative",
        marks: 5,
      },
      {
        text: "Explain what a variable is in programming.",
        type: "descriptive",
        section: "Coding",
        marks: 10,
      },
      {
        text: "Choose the correct synonym for 'happy'.",
        type: "mcq",
        options: { a: "Sad", b: "Joyful", c: "Angry", d: "Tired" },
        correct: "b",
        section: "Verbal",
        marks: 5,
      },
    ];

    for (const q of questions) {
      await pool.query(
        `INSERT INTO questions (assessment_id, question_text, question_type, options, correct_answer, section, marks)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          result.rows[0].id,
          q.text,
          q.type,
          q.type === "mcq" ? JSON.stringify(q.options) : null,
          q.correct || null,
          q.section,
          q.marks,
        ]
      );
    }

    console.log("Test questions added.");
    console.log("Test assessment code: TEST123");

  } catch (error) {
    console.error("Error creating test assessment:", error);
  } finally {
    await pool.end();
  }
}

createTestAssessment();
