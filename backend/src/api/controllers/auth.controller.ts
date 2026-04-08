import { Request, Response } from "express";
import User from "../../models/User";
import { signJwt } from "../../utils/jwt";
import config from "../../config";
import { AuthRequest } from "../middlewares/auth.middleware";

/**
 * LOGIN
 */
export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (String(user.role || "").toUpperCase() === "ADMIN") {
    const configuredAdminPassword = config.ADMIN_SHARED_PASSWORD;
    if (!configuredAdminPassword) {
      return res.status(500).json({
        message: "Admin login password is not configured on the server.",
      });
    }

    if (!password || password !== configuredAdminPassword) {
      return res.status(401).json({ message: "Invalid admin password" });
    }
  }

  const token = signJwt({
    userId: user._id.toString(),
    role: user.role,
  });

  const cookieOptions: any = {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: config.NODE_ENV === "production" ? "none" : "lax" as const,
    maxAge: 4 * 60 * 60 * 1000,
  };

  if (config.COOKIE_DOMAIN) {
    cookieOptions.domain = config.COOKIE_DOMAIN;
  }

  res.cookie("access_token", token, cookieOptions);

  return res.json({
    message: "Login successful",
    token,
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
  const cookieOptions: any = {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: config.NODE_ENV === "production" ? "none" : ("lax" as const),
  };

  if (config.COOKIE_DOMAIN) {
    cookieOptions.domain = config.COOKIE_DOMAIN;
  }

  res.clearCookie("access_token", cookieOptions);

  return res.json({ message: "Logout successful" });
}
