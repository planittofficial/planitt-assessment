import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../../config";
import { JwtPayload } from "../../utils/jwt";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  let token = req.cookies.access_token;

  console.log("DEBUG: Headers:", JSON.stringify(req.headers));
  console.log("DEBUG: Cookies:", JSON.stringify(req.cookies));

  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
    console.log("DEBUG: Token found in Authorization header");
  }

  if (!token) {
    console.log("❌ No token found in cookies or headers");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as unknown as JwtPayload;

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (err) {
    console.log("❌ Token verification failed:", (err as Error).message);
    return res.status(401).json({ message: "Invalid token" });
  }
}
