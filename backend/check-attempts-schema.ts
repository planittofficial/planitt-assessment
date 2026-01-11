import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "backend/.env") });
import pool from "./src/config/db";

async function checkAttemptsSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'attempts';
    `);
    console.log(result.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkAttemptsSchema();
