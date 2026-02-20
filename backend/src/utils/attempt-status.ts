const ACTIVE_ATTEMPT_STATUSES = new Set(["started", "in_progress"]);

export function isActiveAttemptStatus(status: unknown) {
  return ACTIVE_ATTEMPT_STATUSES.has(String(status).toLowerCase());
}
