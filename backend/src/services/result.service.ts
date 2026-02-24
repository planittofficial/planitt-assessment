import Attempt from "../models/Attempt";
import Assessment from "../models/Assessment";

/**
 * Calculates PASS / FAIL for an attempt
 * Must be called AFTER final_score is set
 */
export async function calculatePassFail(attemptId: string) {
  const attempt = await Attempt.findById(attemptId).populate({
    path: "assessment_id",
    select: "total_marks pass_percentage",
  });

  if (!attempt) {
    throw new Error("Attempt not found for result calculation");
  }

  const assessment = attempt.assessment_id as any;
  const total_marks = assessment?.total_marks;
  const pass_percentage = assessment?.pass_percentage;

  if (total_marks === 0) {
    throw new Error("Assessment total_marks cannot be zero");
  }

  const percentage = ((attempt.final_score || 0) / total_marks) * 100;
  const status = percentage >= pass_percentage ? "PASS" : "FAIL";

  await Attempt.findByIdAndUpdate(attemptId, {
    result: status,
  });

  return {
    percentage,
    result: status,
  };
}
