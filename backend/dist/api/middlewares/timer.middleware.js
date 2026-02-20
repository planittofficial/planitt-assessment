"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceAttemptTimer = enforceAttemptTimer;
const timer_service_1 = require("../../services/timer.service");
const validation_1 = require("../../utils/validation");
async function enforceAttemptTimer(req, res, next) {
    const attemptId = req.body.attemptId ||
        req.params.attemptId ||
        req.query.attemptId;
    if (!attemptId)
        return next();
    if (!(0, validation_1.isUuid)(String(attemptId))) {
        return res.status(400).json({ message: "Invalid attemptId" });
    }
    const result = await (0, timer_service_1.enforceTimeLimit)(String(attemptId));
    if (result.expired) {
        return res.status(403).json({
            message: "Time expired. Attempt auto-submitted.",
            autoSubmitted: true,
            reason: "TIME_EXPIRED",
        });
    }
    next();
}
