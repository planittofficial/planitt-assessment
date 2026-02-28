import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";
import { enforceTimeLimit } from "../../services/timer.service";
import mongoose from "mongoose";

export async function enforceAttemptTimer(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const attemptId =
    req.body.attemptId ||
    req.params.attemptId ||
    req.query.attemptId;

  if (!attemptId) return next();

  if (!mongoose.Types.ObjectId.isValid(String(attemptId))) {
    return res.status(400).json({ message: "Invalid attemptId" });
  }

  const result = await enforceTimeLimit(String(attemptId));

  if (result.expired) {
    return res.status(403).json({
      message: "Time expired. Attempt auto-submitted.",
      autoSubmitted: true,
      reason: "TIME_EXPIRED",
    });
  }

  next();
}
