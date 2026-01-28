import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, ".env") });
import pool from "./src/config/db";

async function run() {
  try {
    const res = await pool.query('SELECT DISTINCT role FROM users');
    console.log('Roles in DB:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
