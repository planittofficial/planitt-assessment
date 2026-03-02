import { Response } from "express";
import Attempt from "../../models/Attempt";
import Violation from "../../models/Violation";
import { AuthRequest } from "../middlewares/auth.middleware";
import { checkAutoSubmit } from "../../services/violation.service";
import { enforceTimeLimit } from "../../services/timer.service";
import { isActiveAttemptStatus } from "../../utils/attempt-status";
import { isMobileOrTabletRequest } from "../../utils/device";
import mongoose from "mongoose";
import {
  autoGradeDescriptive,
  autoGradeMCQs,
  calculateFinalScore,
} from "../../services/scoring.service";

function ensureDesktopOnly(req: AuthRequest, res: Response) {
  if (!isMobileOrTabletRequest(req)) return true;
  res.status(403).json({
    message:
      "Assessment is allowed only on desktop or laptop browsers. Mobile and tablet devices are not permitted.",
    reason: "MOBILE_DEVICE_NOT_ALLOWED",
  });
  return false;
}

export async function logViolation(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!ensureDesktopOnly(req, res)) return;

    const { attemptId, violationType } = req.body;
    const userId = req.user.userId;

    if (!attemptId || !violationType) {
      return res.status(400).json({
        message: "attemptId and violationType are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ message: "Invalid attemptId" });
    }

    const attempt = await Attempt.findOne({
      _id: attemptId,
      user_id: userId,
    });

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (!isActiveAttemptStatus(attempt.status)) {
      return res.status(409).json({
        message: "Attempt already submitted",
      });
    }

    const timerCheck = await enforceTimeLimit(attemptId);

    if (timerCheck.expired) {
      return res.status(403).json({
        message: "Time expired. Attempt auto-submitted.",
        autoSubmitted: true,
        reason: "TIME_EXPIRED",
      });
    }

    await Violation.create({
      attempt_id: attemptId,
      violation_type: violationType,
    });

    const enforcement = await checkAutoSubmit(attemptId);

    if (enforcement.autoSubmit) {
      await Attempt.findByIdAndUpdate(attemptId, {
        status: "terminated",
        submitted_at: new Date(),
        auto_submitted: true,
        result: "FAIL",
      });
      await autoGradeMCQs(attemptId);
      await autoGradeDescriptive(attemptId);
      await calculateFinalScore(attemptId);

      return res.status(200).json({
        message: "Violation logged. Attempt auto-submitted.",
        autoSubmitted: true,
        reason: enforcement.reason,
        violationCount: enforcement.totalViolations,
      });
    }

    return res.status(201).json({
      message: "Violation logged",
      autoSubmitted: false,
      violationCount: enforcement.totalViolations,
    });
  } catch (error) {
    console.error("❌ logViolation error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getViolationCount(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!ensureDesktopOnly(req, res)) return;

    const { attemptId } = req.params;
    const userId = req.user.userId;

    if (!attemptId) {
      return res.status(400).json({ message: "attemptId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ message: "Invalid attemptId" });
    }

    const attempt = await Attempt.findOne({
      _id: attemptId,
      user_id: userId,
    });

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    const violationCount = await Violation.countDocuments({
      attempt_id: attemptId,
    });

    return res.status(200).json({
      attemptId,
      violationCount,
    });
  } catch (error) {
    console.error("getViolationCount error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
