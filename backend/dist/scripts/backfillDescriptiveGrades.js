"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const Answer_1 = __importDefault(require("../models/Answer"));
const Attempt_1 = __importDefault(require("../models/Attempt"));
require("../models/Question");
require("../models/Assessment");
const scoring_service_1 = require("../services/scoring.service");
const result_service_1 = require("../services/result.service");
const attempt_status_1 = require("../utils/attempt-status");
dotenv_1.default.config();
async function connect() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error("MONGODB_URI is not defined in environment variables");
    }
    await mongoose_1.default.connect(mongoUri, {
        retryWrites: true,
        w: "majority",
    });
}
async function findAttemptIdsWithPendingDescriptiveAnswers() {
    const rows = await Answer_1.default.aggregate([
        { $match: { is_graded: false } },
        {
            $lookup: {
                from: "questions",
                localField: "question_id",
                foreignField: "_id",
                as: "question",
            },
        },
        { $unwind: "$question" },
        { $match: { "question.question_type": "descriptive" } },
        { $group: { _id: "$attempt_id" } },
    ]);
    return rows.map((row) => String(row._id));
}
async function backfillPendingDescriptive() {
    const stats = {
        candidateAttempts: 0,
        processedAttempts: 0,
        skippedActiveAttempts: 0,
        skippedMissingAttempts: 0,
        resultRecomputed: 0,
        resultPreserved: 0,
        errors: 0,
    };
    const attemptIds = await findAttemptIdsWithPendingDescriptiveAnswers();
    stats.candidateAttempts = attemptIds.length;
    console.log(`Found ${stats.candidateAttempts} attempt(s) with pending descriptive answers`);
    for (const attemptId of attemptIds) {
        try {
            const attempt = await Attempt_1.default.findById(attemptId).select("status result");
            if (!attempt) {
                stats.skippedMissingAttempts += 1;
                console.warn(`Skipping ${attemptId}: attempt not found`);
                continue;
            }
            if ((0, attempt_status_1.isActiveAttemptStatus)(attempt.status)) {
                stats.skippedActiveAttempts += 1;
                console.warn(`Skipping ${attemptId}: attempt is still active`);
                continue;
            }
            await (0, scoring_service_1.autoGradeMCQs)(attemptId);
            await (0, scoring_service_1.autoGradeDescriptive)(attemptId);
            await (0, scoring_service_1.calculateFinalScore)(attemptId);
            stats.processedAttempts += 1;
            const shouldPreserveFail = String(attempt.status).toLowerCase() === "terminated" &&
                String(attempt.result || "").toUpperCase() === "FAIL";
            if (shouldPreserveFail) {
                stats.resultPreserved += 1;
            }
            else {
                try {
                    await (0, result_service_1.calculatePassFail)(attemptId);
                    stats.resultRecomputed += 1;
                }
                catch (error) {
                    console.warn(`Result calculation skipped for ${attemptId}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }
        catch (error) {
            stats.errors += 1;
            console.error(`Failed to backfill attempt ${attemptId}:`, error instanceof Error ? error.message : error);
        }
    }
    console.log("Backfill summary:");
    console.log(`- candidateAttempts: ${stats.candidateAttempts}`);
    console.log(`- processedAttempts: ${stats.processedAttempts}`);
    console.log(`- skippedActiveAttempts: ${stats.skippedActiveAttempts}`);
    console.log(`- skippedMissingAttempts: ${stats.skippedMissingAttempts}`);
    console.log(`- resultRecomputed: ${stats.resultRecomputed}`);
    console.log(`- resultPreserved: ${stats.resultPreserved}`);
    console.log(`- errors: ${stats.errors}`);
}
async function main() {
    try {
        await connect();
        console.log("Connected to MongoDB");
        await backfillPendingDescriptive();
        process.exit(0);
    }
    catch (error) {
        console.error("Backfill failed:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
    finally {
        await mongoose_1.default.disconnect().catch(() => undefined);
    }
}
main();
