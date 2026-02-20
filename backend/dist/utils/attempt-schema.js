"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAttemptsStartedColumn = getAttemptsStartedColumn;
exports.getAttemptsSubmittedColumn = getAttemptsSubmittedColumn;
exports.hasAttemptsAutoSubmittedColumn = hasAttemptsAutoSubmittedColumn;
const db_1 = __importDefault(require("../config/db"));
let attemptsStartedColumnCache = null;
let attemptsSubmittedColumnCache = null;
let attemptsHasAutoSubmittedCache = null;
async function getAttemptsStartedColumn() {
    if (attemptsStartedColumnCache) {
        return attemptsStartedColumnCache;
    }
    const result = await db_1.default.query(`SELECT 1
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'attempts'
       AND column_name = 'started_at'
     LIMIT 1`);
    attemptsStartedColumnCache = (result.rowCount ?? 0) > 0 ? "started_at" : "start_time";
    return attemptsStartedColumnCache;
}
async function getAttemptsSubmittedColumn() {
    if (attemptsSubmittedColumnCache) {
        return attemptsSubmittedColumnCache;
    }
    const result = await db_1.default.query(`SELECT 1
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'attempts'
       AND column_name = 'submitted_at'
     LIMIT 1`);
    attemptsSubmittedColumnCache = (result.rowCount ?? 0) > 0 ? "submitted_at" : "end_time";
    return attemptsSubmittedColumnCache;
}
async function hasAttemptsAutoSubmittedColumn() {
    if (attemptsHasAutoSubmittedCache !== null) {
        return attemptsHasAutoSubmittedCache;
    }
    const result = await db_1.default.query(`SELECT 1
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'attempts'
       AND column_name = 'auto_submitted'
     LIMIT 1`);
    attemptsHasAutoSubmittedCache = (result.rowCount ?? 0) > 0;
    return attemptsHasAutoSubmittedCache;
}
