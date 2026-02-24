import Answer from "../models/Answer";
import Attempt from "../models/Attempt";
import { calculatePassFail } from "./result.service";

/**
 * Finalizes an attempt if all answers are graded
 */
export async function finalizeAttemptIfComplete(attemptId: string) {
  const pending = await Answer.countDocuments({
    attempt_id: attemptId,
    is_graded: false,
  });

  if (pending > 0) {
    return { finalized: false };
  }

  const answers = await Answer.find({ attempt_id: attemptId });
  const totalScore = answers.reduce((sum, a) => sum + (a.marks_obtained || 0), 0);

  await Attempt.findByIdAndUpdate(attemptId, {
    final_score: totalScore,
  });

  const result = await calculatePassFail(attemptId);

  return {
    finalized: true,
    result: result.result,
    percentage: result.percentage,
  };
}

