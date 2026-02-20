"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isActiveAttemptStatus = isActiveAttemptStatus;
const ACTIVE_ATTEMPT_STATUSES = new Set(["started", "in_progress"]);
function isActiveAttemptStatus(status) {
    return ACTIVE_ATTEMPT_STATUSES.has(String(status).toLowerCase());
}
