import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "backend/.env") });
import pool from "./src/config/db";

async function checkUser() {
  try {
    const result = await pool.query(`
      SELECT email, role 
      FROM users;
    `);
    console.log(result.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkUser();
