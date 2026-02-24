import Violation from "../models/Violation";

export async function checkAutoSubmit(attemptId: string) {
  const violations = await Violation.find({ attempt_id: attemptId });

  const totalViolations = violations.length;

  for (const violation of violations) {
    if (violation.violation_type === "AUTO_TYPER_DETECTED") {
      return { autoSubmit: true, reason: "AUTO_TYPER_DETECTED", totalViolations };
    }
  }

  if (totalViolations >= 3) {
    return { autoSubmit: true, reason: "TOTAL_VIOLATION_LIMIT", totalViolations };
  }

  return { autoSubmit: false, totalViolations };
}
