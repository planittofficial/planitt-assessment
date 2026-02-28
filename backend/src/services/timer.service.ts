import Attempt from "../models/Attempt";
import { isActiveAttemptStatus } from "../utils/attempt-status";
import {
  autoGradeDescriptive,
  autoGradeMCQs,
  calculateFinalScore,
} from "./scoring.service";
import { calculatePassFail } from "./result.service";

/**
 * Checks if an attempt has exceeded its allowed duration.
 * If yes → auto-submit.
 */
export async function enforceTimeLimit(attemptId: string) {
  const attempt = await Attempt.findById(attemptId).populate({
    path: "assessment_id",
    select: "duration_minutes",
  });

  if (!attempt) return { expired: false };

  if (!isActiveAttemptStatus(attempt.status)) {
    return { expired: false };
  }

  const assessment = attempt.assessment_id as any;
  const durationMinutes = assessment?.duration_minutes;

  const startTime = new Date(attempt.started_at).getTime();
  const durationMs = durationMinutes * 60 * 1000;
  const now = Date.now();

  if (now >= startTime + durationMs) {
    await Attempt.findByIdAndUpdate(attemptId, {
      status: "terminated",
      submitted_at: new Date(),
      auto_submitted: true,
    });

    await autoGradeMCQs(attemptId);
    await autoGradeDescriptive(attemptId);
    await calculateFinalScore(attemptId);

    try {
      await calculatePassFail(attemptId);
    } catch {
      // Keep timer auto-submit resilient even if pass/fail config is incomplete.
    }

    return { expired: true };
  }

  return { expired: false };
}
