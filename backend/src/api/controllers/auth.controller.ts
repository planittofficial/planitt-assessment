import { Request, Response } from "express";
import pool from "../../config/db";
import { signJwt } from "../../utils/jwt";
import config from "../../config";
import { AuthRequest } from "../middlewares/auth.middleware";

/**
 * LOGIN
 */
export async function login(req: Request, res: Response) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  // 1️⃣ Find user
  const userResult = await pool.query(
    "SELECT id, role, email, full_name FROM users WHERE email = $1",
    [email]
  );

  if (userResult.rowCount === 0) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const user = userResult.rows[0];

  // 2️⃣ Sign JWT
  const token = signJwt({
    userId: user.id,
    role: user.role,
  });

  // 3️⃣ Set HttpOnly Cookie
  const isProd = config.NODE_ENV === "production";

  res.cookie("access_token", token, {
    httpOnly: true,
    secure: false, // localhost
    sameSite: "lax",
    domain: isProd ? config.COOKIE_DOMAIN : undefined,
    maxAge: 4 * 60 * 60 * 1000,
  });

  return res.json({
    message: "Login successful",
    role: user.role,
    email: user.email,
    full_name: user.full_name,
  });
}

/**
 * AUTH SESSION CHECK (ME)
 */
export async function me(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userResult = await pool.query(
    `SELECT id, role, email, full_name
     FROM users
     WHERE id = $1`,
    [req.user.userId]
  );

  if (userResult.rowCount === 0) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = userResult.rows[0];

  return res.json({
    userId: user.id,
    role: user.role,
    email: user.email,
    full_name: user.full_name,
  });
}

/**
 * LOGOUT
 */
export async function logout(_req: Request, res: Response) {
  const isProd = config.NODE_ENV === "production";

  res.clearCookie("access_token", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    domain: isProd ? config.COOKIE_DOMAIN : undefined,
  });

  return res.json({ message: "Logout successful" });
}
