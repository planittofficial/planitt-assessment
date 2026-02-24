"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAttemptsStartedColumn = getAttemptsStartedColumn;
exports.getAttemptsSubmittedColumn = getAttemptsSubmittedColumn;
exports.hasAttemptsAutoSubmittedColumn = hasAttemptsAutoSubmittedColumn;
async function getAttemptsStartedColumn() {
    return "started_at";
}
async function getAttemptsSubmittedColumn() {
    return "submitted_at";
}
async function hasAttemptsAutoSubmittedColumn() {
    return true;
}
