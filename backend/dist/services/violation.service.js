"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAutoSubmit = checkAutoSubmit;
const Violation_1 = __importDefault(require("../models/Violation"));
async function checkAutoSubmit(attemptId) {
    const violations = await Violation_1.default.find({ attempt_id: attemptId });
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
