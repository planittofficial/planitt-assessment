import { Response } from "express";
import Attempt from "../../models/Attempt";
import Assessment from "../../models/Assessment";
import Question from "../../models/Question";
import Answer from "../../models/Answer";
import { AuthRequest } from "../middlewares/auth.middleware";
import {
  autoGradeDescriptive,
  autoGradeMCQs,
  calculateFinalScore,
} from "../../services/scoring.service";
import { calculatePassFail } from "../../services/result.service";
import { isActiveAttemptStatus } from "../../utils/attempt-status";
import { isMobileOrTabletRequest } from "../../utils/device";
import mongoose from "mongoose";
import crypto from "crypto";

const QUESTIONS_PER_SECTION = 15;

async function fetchActiveAssessmentById(assessmentId: string) {
  return Assessment.findOne({
    _id: assessmentId,
    is_active: true,
  }).select("id duration_minutes code");
}

async function fetchActiveAssessmentByCode(assessmentCode: string) {
  return Assessment.findOne({
    code: assessmentCode.toUpperCase(),
    is_active: true,
  }).select("id duration_minutes code");
}

function hashForShuffle(id: string, attemptId: string): number {
  const combined = id + attemptId;
  const hash = crypto.createHash("md5").update(combined).digest("hex");
  return parseInt(hash.substring(0, 8), 16);
}

async function fetchQuestionsForAttempt(assessmentId: string, attemptId: string) {
  const questions = await Question.find({
    assessment_id: assessmentId,
  }).lean();

  const sections = ["Quantitative", "Verbal", "Coding", "Logical"];
  const questionsBySection: Record<string, any[]> = {
    Quantitative: [],
    Verbal: [],
    Coding: [],
    Logical: [],
  };

  for (const question of questions) {
    const section = question.section || "Logical";
    if (questionsBySection[section]) {
      questionsBySection[section].push(question);
    }
  }

  const result = [];
  for (const section of sections) {
    let sectionQuestions = questionsBySection[section] || [];

    sectionQuestions.sort((a, b) => {
      const hashA = hashForShuffle(a._id.toString(), attemptId);
      const hashB = hashForShuffle(b._id.toString(), attemptId);
      return hashA - hashB;
    });

    sectionQuestions = sectionQuestions.slice(0, QUESTIONS_PER_SECTION);

    for (const q of sectionQuestions) {
      const formattedQuestion: any = {
        id: q._id,
        question_text: q.question_text,
        question_type: q.question_type,
        marks: q.marks,
        section: q.section,
      };

      if (q.question_type === "mcq" && q.options) {
        if (Array.isArray(q.options)) {
          formattedQuestion.options = q.options.map((text: string, idx: number) => ({
            id: String.fromCharCode(97 + idx),
            text,
          }));
        } else if (typeof q.options === "object") {
          formattedQuestion.options = Object.entries(q.options).map(
            ([key, value]) => ({
              id: key,
              text: value,
            })
          );
        }
      }

      result.push(formattedQuestion);
    }
  }

  return result;
}

async function createAttemptRecord(userId: string, assessmentId: string) {
  const attempt = new Attempt({
    user_id: userId,
    assessment_id: assessmentId,
    status: "started",
    started_at: new Date(),
  });
  await attempt.save();
  return attempt;
}

async function markAttemptCompleted(attemptId: string) {
  return Attempt.findByIdAndUpdate(
    attemptId,
    {
      status: "completed",
      submitted_at: new Date(),
    },
    { new: true }
  );
}

function ensureDesktopOnly(req: AuthRequest, res: Response) {
  if (!isMobileOrTabletRequest(req)) return true;
  res.status(403).json({
    message:
      "Assessment is allowed only on desktop or laptop browsers. Mobile and tablet devices are not permitted.",
    reason: "MOBILE_DEVICE_NOT_ALLOWED",
  });
  return false;
}

export async function startAttempt(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!ensureDesktopOnly(req, res)) return;

    const { assessmentId, assessmentCode } = req.body as {
      assessmentId?: string;
      assessmentCode?: string;
    };
    const userId = req.user.userId;

    if (!assessmentCode && !assessmentId) {
      return res.status(400).json({ message: "Assessment code or ID is required" });
    }

    let assessment;
    if (assessmentId) {
      if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
        return res.status(400).json({ message: "Invalid assessment ID" });
      }
      assessment = await fetchActiveAssessmentById(assessmentId);
    } else {
      assessment = await fetchActiveAssessmentByCode(
        String(assessmentCode).toUpperCase()
      );
    }

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found or inactive" });
    }

    if (assessmentCode && assessment.code !== String(assessmentCode).toUpperCase()) {
      return res.status(403).json({ message: "Code mismatch for this assessment" });
    }

    const existingAttempt = await Attempt.findOne({
      user_id: userId,
      assessment_id: assessment._id,
    }).sort({ started_at: -1 });

    if (existingAttempt) {
      if (isActiveAttemptStatus(existingAttempt.status)) {
        return res.status(409).json({
          message: "An active attempt already exists",
          attemptId: existingAttempt._id,
        });
      }

      return res.status(403).json({
        message: "You have already completed this assessment and cannot retake it.",
      });
    }

    const attempt = await createAttemptRecord(userId, assessment._id.toString());
    const questions = await fetchQuestionsForAttempt(
      assessment._id.toString(),
      attempt._id.toString()
    );

    if (questions.length === 0) {
      return res
        .status(500)
        .json({ message: "No questions configured for this assessment" });
    }

    return res.status(201).json({
      message: "Attempt started",
      attemptId: attempt._id,
      durationMinutes: assessment.duration_minutes,
      questions,
    });
  } catch (error) {
    console.error("startAttempt error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function submitAttempt(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!ensureDesktopOnly(req, res)) return;

    const { attemptId } = req.body as { attemptId?: string };
    const userId = req.user.userId;

    if (!attemptId) {
      return res.status(400).json({ message: "attemptId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ message: "Invalid attemptId" });
    }

    const attempt = await Attempt.findOne({
      _id: attemptId,
      user_id: userId,
    });

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (!isActiveAttemptStatus(attempt.status)) {
      return res.status(409).json({ message: "Attempt already submitted" });
    }

    await markAttemptCompleted(attemptId);

    await autoGradeMCQs(attemptId);
    await autoGradeDescriptive(attemptId);
    const score = await calculateFinalScore(attemptId);
    try {
      await calculatePassFail(attemptId);
    } catch (error: any) {
      if (String(error?.message || "").includes("total_marks cannot be zero")) {
        return res.status(409).json({
          message: "Assessment scoring is not configured yet. Please contact administrator.",
        });
      }
      throw error;
    }

    return res.json({
      message: "Attempt submitted successfully",
      score,
    });
  } catch (error) {
    console.error("submitAttempt error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getQuestions(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!ensureDesktopOnly(req, res)) return;

    const attemptId = req.params.attemptId;
    const userId = req.user.userId;

    if (!attemptId) {
      return res.status(400).json({ message: "Invalid attemptId" });
    }

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ message: "Invalid attemptId" });
    }

    const attempt = await Attempt.findOne({
      _id: attemptId,
      user_id: userId,
    }).select("assessment_id status");

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    const questions = await fetchQuestionsForAttempt(
      attempt.assessment_id.toString(),
      attemptId
    );

    return res.json(questions);
  } catch (error) {
    console.error("getQuestions error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function saveAnswer(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!ensureDesktopOnly(req, res)) return;

    const attemptId = req.params.attemptId;
    const { questionId: rawQuestionId, answer } = req.body;
    const userId = req.user.userId;
    const questionId =
      typeof rawQuestionId === "string" ? rawQuestionId.trim() : rawQuestionId;

    if (!attemptId || !questionId || answer === undefined) {
      return res
        .status(400)
        .json({ message: "Invalid attemptId, questionId or answer" });
    }

    if (
      !mongoose.Types.ObjectId.isValid(attemptId) ||
      !mongoose.Types.ObjectId.isValid(questionId)
    ) {
      return res.status(400).json({ message: "Invalid attemptId or questionId" });
    }

    const attempt = await Attempt.findOne({
      _id: attemptId,
      user_id: userId,
    }).select("assessment_id status");

    if (!attempt) {
      return res
        .status(404)
        .json({ message: "Active attempt not found or already submitted" });
    }

    if (!isActiveAttemptStatus(attempt.status)) {
      return res
        .status(404)
        .json({ message: "Active attempt not found or already submitted" });
    }

    const question = await Question.findOne({
      _id: questionId,
      assessment_id: attempt.assessment_id,
    }).select("_id");

    if (!question) {
      return res
        .status(400)
        .json({ message: "Question does not belong to this assessment" });
    }

    let answerRecord = await Answer.findOne({
      attempt_id: attemptId,
      question_id: questionId,
    });

    if (answerRecord) {
      answerRecord.answer_text = answer;
      await answerRecord.save();
      return res.json({
        message: "Answer saved successfully",
        answerId: answerRecord._id,
      });
    }

    const newAnswer = await Answer.create({
      attempt_id: attemptId,
      question_id: questionId,
      answer_text: answer,
    });

    return res.json({
      message: "Answer saved successfully",
      answerId: newAnswer._id,
    });
  } catch (error) {
    console.error("saveAnswer error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
