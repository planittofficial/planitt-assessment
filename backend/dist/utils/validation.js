"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUuid = isUuid;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NUMERIC_ID_REGEX = /^\d+$/;
function isUuid(value) {
    if (value === null || typeof value === "undefined") {
        return false;
    }
    const normalized = String(value).trim();
    return UUID_REGEX.test(normalized) || NUMERIC_ID_REGEX.test(normalized);
}
