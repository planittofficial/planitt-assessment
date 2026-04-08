import Attempt from "../models/Attempt";
import "../models/Assessment";

function normalizeResult(value: unknown): "PASS" | "FAIL" | null {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "PASS" || normalized === "FAIL") {
    return normalized;
  }
  return null;
}

/**
 * Calculates PASS / FAIL for an attempt.
 * Manual overrides are preserved unless explicitly cleared first.
 */
export async function calculatePassFail(attemptId: string) {
  const attempt = await Attempt.findById(attemptId).populate({
    path: "assessment_id",
    select: "total_marks pass_percentage",
  });

  if (!attempt) {
    throw new Error("Attempt not found for result calculation");
  }

  const manualResult = normalizeResult(attempt.result_override);
  if (manualResult) {
    await Attempt.findByIdAndUpdate(attemptId, {
      result: manualResult,
    });

    return {
      percentage: null,
      result: manualResult,
      source: "manual" as const,
    };
  }

  const assessment = attempt.assessment_id as any;
  const totalMarks = assessment?.total_marks;
  const passPercentage = assessment?.pass_percentage;

  if (totalMarks === 0) {
    throw new Error("Assessment total_marks cannot be zero");
  }

  const percentage = ((attempt.final_score || 0) / totalMarks) * 100;
  const status = percentage >= passPercentage ? "PASS" : "FAIL";

  await Attempt.findByIdAndUpdate(attemptId, {
    result: status,
  });

  return {
    percentage,
    result: status,
    source: "criteria" as const,
  };
}

export async function setManualResultOverride(
  attemptId: string,
  result: "PASS" | "FAIL" | null
) {
  const update =
    result === null
      ? { result_override: null }
      : { result_override: result, result };

  const attempt = await Attempt.findByIdAndUpdate(attemptId, update, { new: true });

  if (!attempt) {
    throw new Error("Attempt not found");
  }

  if (result === null) {
    return calculatePassFail(attemptId);
  }

  return {
    percentage: null,
    result,
    source: "manual" as const,
  };
}

export async function recalculateAssessmentResults(assessmentId: string) {
  const attempts = await Attempt.find({
    assessment_id: assessmentId,
    final_score: { $ne: null },
  }).select("_id");

  let recalculated = 0;
  let skippedManual = 0;

  for (const attempt of attempts) {
    const current = await Attempt.findById(attempt._id).select("result_override");
    const manualResult = normalizeResult(current?.result_override);

    if (manualResult) {
      skippedManual += 1;
      continue;
    }

    await calculatePassFail(String(attempt._id));
    recalculated += 1;
  }

  return {
    recalculated,
    skippedManual,
    total: attempts.length,
  };
}
