import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export function requireCandidate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const role = req.user?.role?.toUpperCase();
  console.log("DEBUG: Checking role for candidate access:", role, "Full User Object:", req.user);
  if (role !== "CANDIDATE") {
    console.log("DEBUG: Access denied due to role mismatch. Expected CANDIDATE, got:", role);
    return res.status(403).json({ message: "Access denied. Only candidates can take assessments." });
  }
  next();
}

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const role = req.user?.role?.toUpperCase();
  if (role !== "ADMIN") {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
}

export function requireRole(roleName: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const role = req.user?.role?.toUpperCase();
    if (role !== roleName.toUpperCase()) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
}
