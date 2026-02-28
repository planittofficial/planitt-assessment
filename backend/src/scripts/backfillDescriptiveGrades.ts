import dotenv from "dotenv";
import mongoose from "mongoose";
import Answer from "../models/Answer";
import Attempt from "../models/Attempt";
import "../models/Question";
import "../models/Assessment";
import {
  autoGradeDescriptive,
  autoGradeMCQs,
  calculateFinalScore,
} from "../services/scoring.service";
import { calculatePassFail } from "../services/result.service";
import { isActiveAttemptStatus } from "../utils/attempt-status";

dotenv.config();

type BackfillStats = {
  candidateAttempts: number;
  processedAttempts: number;
  skippedActiveAttempts: number;
  skippedMissingAttempts: number;
  resultRecomputed: number;
  resultPreserved: number;
  errors: number;
};

async function connect() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }
  await mongoose.connect(mongoUri, {
    retryWrites: true,
    w: "majority",
  });
}

async function findAttemptIdsWithPendingDescriptiveAnswers() {
  const rows = await Answer.aggregate<{ _id: mongoose.Types.ObjectId }>([
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
  const stats: BackfillStats = {
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

  console.log(
    `Found ${stats.candidateAttempts} attempt(s) with pending descriptive answers`
  );

  for (const attemptId of attemptIds) {
    try {
      const attempt = await Attempt.findById(attemptId).select("status result");
      if (!attempt) {
        stats.skippedMissingAttempts += 1;
        console.warn(`Skipping ${attemptId}: attempt not found`);
        continue;
      }

      if (isActiveAttemptStatus(attempt.status)) {
        stats.skippedActiveAttempts += 1;
        console.warn(`Skipping ${attemptId}: attempt is still active`);
        continue;
      }

      await autoGradeMCQs(attemptId);
      await autoGradeDescriptive(attemptId);
      await calculateFinalScore(attemptId);
      stats.processedAttempts += 1;

      const shouldPreserveFail =
        String(attempt.status).toLowerCase() === "terminated" &&
        String(attempt.result || "").toUpperCase() === "FAIL";

      if (shouldPreserveFail) {
        stats.resultPreserved += 1;
      } else {
        try {
          await calculatePassFail(attemptId);
          stats.resultRecomputed += 1;
        } catch (error) {
          console.warn(
            `Result calculation skipped for ${attemptId}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    } catch (error) {
      stats.errors += 1;
      console.error(
        `Failed to backfill attempt ${attemptId}:`,
        error instanceof Error ? error.message : error
      );
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
  } catch (error) {
    console.error(
      "Backfill failed:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }
}

main();
