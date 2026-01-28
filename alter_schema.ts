import dotenv from "dotenv";
import pool from "./backend/src/config/db";

dotenv.config();

async function alterSchema() {
  try {
    console.log("Altering assessments table to add is_active column...");

    // Add is_active column if it doesn't exist
    await pool.query(`
      ALTER TABLE assessments
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `);

    // Add is_published column to attempts if it doesn't exist
    await pool.query(`
      ALTER TABLE attempts
      ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;
    `);

    // Update any existing assessments to be active
    await pool.query(`
      UPDATE assessments
      SET is_active = true
      WHERE is_active IS NULL;
    `);

    console.log("Schema alterations completed successfully.");

  } catch (error) {
    console.error("Error altering schema:", error);
  } finally {
    await pool.end();
  }
}

alterSchema();
