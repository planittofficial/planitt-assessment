import { Request, Response } from "express";
import User from "../../models/User";
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

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = signJwt({
    userId: user._id.toString(),
    role: user.role,
  });

  const isProd = config.NODE_ENV === "production";

  res.cookie("access_token", token, {
    httpOnly: true,
    secure: false,
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

  const user = await User.findById(req.user.userId);

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return res.json({
    userId: user._id.toString(),
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
