import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, ".env") });
import pool from "./src/config/db";

async function checkData() {
  try {
    console.log("--- Roles in users ---");
    const roles = await pool.query('SELECT DISTINCT role FROM users');
    console.log(roles.rows);

    console.log("--- Results in attempts ---");
    const results = await pool.query('SELECT DISTINCT result FROM attempts');
    console.log(results.rows);

    console.log("--- Statuses in attempts ---");
    const statuses = await pool.query('SELECT DISTINCT status FROM attempts');
    console.log(statuses.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkData();
