import { Request, Response } from "express";
import User from "../../models/User";
import Assessment from "../../models/Assessment";
import Question from "../../models/Question";
import Answer from "../../models/Answer";
import Attempt from "../../models/Attempt";
import Violation from "../../models/Violation";
import { AuthRequest } from "../middlewares/auth.middleware";
import { finalizeAttemptIfComplete } from "../../services/finalizeAttempt.service";
import {
  recalculateAssessmentResults,
  setManualResultOverride,
} from "../../services/result.service";
import mongoose from "mongoose";

const ALLOWED_SECTIONS = new Set(["Quantitative", "Verbal", "Coding", "Logical"]);

function normalizeQuestionType(value: unknown): "mcq" | "descriptive" | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "mcq" || normalized === "descriptive") {
    return normalized;
  }
  return null;
}

function normalizeSection(value: unknown): string | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "quantitative") return "Quantitative";
  if (normalized === "verbal") return "Verbal";
  if (normalized === "coding") return "Coding";
  if (normalized === "logical") return "Logical";
  return null;
}

function requireObjectIdParam(res: Response, name: string, value: unknown): boolean {
  if (typeof value !== "string" || !mongoose.Types.ObjectId.isValid(value)) {
    res.status(400).json({ message: `Invalid ${name}` });
    return false;
  }
  return true;
}

export async function getAssessments(req: Request, res: Response) {
  try {
    const assessments = await Assessment.find()
      .select("_id title is_active code created_at duration_minutes")
      .sort({ created_at: -1 });

    const formatted = assessments.map((a) => ({
      id: a._id,
      title: a.title,
      status: a.is_active ? "active" : "inactive",
      code: a.code,
      duration_minutes: a.duration_minutes,
      created_at: a.created_at,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("❌ getAssessments error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getAssessmentById(req: Request, res: Response) {
  try {
    const { assessmentId } = req.params;
    if (!requireObjectIdParam(res, "assessmentId", assessmentId)) {
      return;
    }

    const assessment = await Assessment.findById(assessmentId).select(
      "_id title duration_minutes pass_percentage is_active code total_marks"
    );

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    res.json({
      id: assessment._id,
      title: assessment.title,
      duration_minutes: assessment.duration_minutes,
      pass_percentage: assessment.pass_percentage,
      status: assessment.is_active ? "active" : "inactive",
      code: assessment.code,
      total_marks: assessment.total_marks,
    });
  } catch (error) {
    console.error("❌ getAssessmentById error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getAttemptsByAssessment(
  req: AuthRequest,
  res: Response
) {
  try {
    const assessmentId = req.params.assessmentId;

    if (!assessmentId) {
      return res.status(400).json({
        message: "Invalid or missing assessmentId",
      });
    }
    if (!requireObjectIdParam(res, "assessmentId", assessmentId)) {
      return;
    }

    const attempts = await Attempt.find({ assessment_id: assessmentId })
      .populate({
        path: "user_id",
        select: "email full_name",
      })
      .sort({ started_at: -1 })
      .lean();

    const formatted = attempts.map((a) => ({
      id: a._id,
      user_id: a.user_id,
      email: (a.user_id as any)?.email,
      full_name: (a.user_id as any)?.full_name,
      status: a.status,
      started_at: a.started_at,
      submitted_at: a.submitted_at,
      final_score: a.final_score,
      result: a.result,
      result_override: a.result_override,
      is_published: a.is_published,
    }));

    return res.json(formatted);
  } catch (error) {
    console.error("❌ getAttemptsByAssessment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getViolationsByAttempt(req: Request, res: Response) {
  try {
    const { attemptId } = req.params;
    if (!requireObjectIdParam(res, "attemptId", attemptId)) {
      return;
    }

    const violations = await Violation.find({ attempt_id: attemptId })
      .sort({ timestamp: 1 })
      .lean();

    const formatted = violations.map((v) => ({
      violation_type: v.violation_type,
      timestamp: v.timestamp,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("❌ getViolationsByAttempt error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getAttemptSummary(req: Request, res: Response) {
  try {
    const { attemptId } = req.params;
    if (!requireObjectIdParam(res, "attemptId", attemptId)) {
      return;
    }

    const attempt = await Attempt.findById(attemptId)
      .populate({
        path: "user_id",
        select: "email",
      })
      .lean();

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    const violationCount = await Violation.countDocuments({
      attempt_id: attemptId,
    });

    res.json({
      id: attempt._id,
      email: (attempt.user_id as any)?.email,
      status: attempt.status,
      started_at: attempt.started_at,
      submitted_at: attempt.submitted_at,
      violations: violationCount,
    });
  } catch (error) {
    console.error("❌ getAttemptSummary error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getAttemptDetails(req: Request, res: Response) {
  try {
    const { attemptId } = req.params;
    if (!requireObjectIdParam(res, "attemptId", attemptId)) {
      return;
    }

    const attempt = await Attempt.findById(attemptId)
      .populate({
        path: "user_id",
        select: "email full_name",
      })
      .populate({
        path: "assessment_id",
        select: "title total_marks",
      })
      .lean();

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    const answers = await Answer.find({ attempt_id: attemptId })
      .populate({
        path: "question_id",
        select: "question_text question_type correct_answer marks section",
      })
      .sort({ _id: 1 })
      .lean();

    function formatQuestionTypeForUi(value: unknown) {
      const normalized = String(value || "").trim().toLowerCase();
      if (normalized === "mcq") return "MCQ";
      if (normalized === "descriptive") return "DESCRIPTIVE";
      return String(value || "");
    }

    const formattedAnswers = answers.map((a) => ({
      answer_id: a._id,
      question_text: (a.question_id as any)?.question_text,
      question_type: formatQuestionTypeForUi((a.question_id as any)?.question_type),
      section: (a.question_id as any)?.section,
      correct_answer: (a.question_id as any)?.correct_answer,
      user_answer: a.answer_text,
      marks_obtained: a.marks_obtained,
      max_marks: (a.question_id as any)?.marks,
      is_graded: a.is_graded,
    }));

    const analytics = (() => {
      const sectionStats: Record<
        string,
        {
          total_questions: number;
          attempted_questions: number;
          mcq_total: number;
          mcq_attempted: number;
          mcq_correct: number;
          mcq_incorrect: number;
          descriptive_total: number;
          descriptive_attempted: number;
          descriptive_pending_grading: number;
          marks_obtained: number;
          max_marks: number;
        }
      > = {};

      let totalQuestions = 0;
      let attemptedQuestions = 0;
      let mcqTotal = 0;
      let mcqAttempted = 0;
      let mcqCorrect = 0;
      let mcqIncorrect = 0;
      let descriptiveTotal = 0;
      let descriptiveAttempted = 0;
      let descriptivePendingGrading = 0;
      let marksObtained = 0;
      let maxMarks = 0;

      for (const answer of formattedAnswers) {
        totalQuestions += 1;
        const sectionName = String(answer.section || "Unsectioned");
        const questionType = String(answer.question_type || "");
        const userAnswer = String(answer.user_answer || "").trim();
        const hasAnswer = userAnswer.length > 0;
        const questionMaxMarks = Number(answer.max_marks ?? 0) || 0;
        const questionMarksObtained = Number(answer.marks_obtained ?? 0) || 0;
        const isGraded = Boolean(answer.is_graded);

        if (!sectionStats[sectionName]) {
          sectionStats[sectionName] = {
            total_questions: 0,
            attempted_questions: 0,
            mcq_total: 0,
            mcq_attempted: 0,
            mcq_correct: 0,
            mcq_incorrect: 0,
            descriptive_total: 0,
            descriptive_attempted: 0,
            descriptive_pending_grading: 0,
            marks_obtained: 0,
            max_marks: 0,
          };
        }

        const section = sectionStats[sectionName];
        section.total_questions += 1;
        section.max_marks += questionMaxMarks;
        section.marks_obtained += questionMarksObtained;

        maxMarks += questionMaxMarks;
        marksObtained += questionMarksObtained;

        if (hasAnswer) {
          attemptedQuestions += 1;
          section.attempted_questions += 1;
        }

        if (questionType === "MCQ") {
          mcqTotal += 1;
          section.mcq_total += 1;
          if (hasAnswer) {
            mcqAttempted += 1;
            section.mcq_attempted += 1;
            const correctAnswer = String(answer.correct_answer || "").trim();
            if (correctAnswer.length > 0 && userAnswer === correctAnswer) {
              mcqCorrect += 1;
              section.mcq_correct += 1;
            } else {
              mcqIncorrect += 1;
              section.mcq_incorrect += 1;
            }
          }
        } else if (questionType === "DESCRIPTIVE") {
          descriptiveTotal += 1;
          section.descriptive_total += 1;
          if (hasAnswer) {
            descriptiveAttempted += 1;
            section.descriptive_attempted += 1;
            if (!isGraded) {
              descriptivePendingGrading += 1;
              section.descriptive_pending_grading += 1;
            }
          }
        }
      }

      return {
        total_questions: totalQuestions,
        attempted_questions: attemptedQuestions,
        unattempted_questions: totalQuestions - attemptedQuestions,
        mcq_total: mcqTotal,
        mcq_attempted: mcqAttempted,
        mcq_correct: mcqCorrect,
        mcq_incorrect: mcqIncorrect,
        descriptive_total: descriptiveTotal,
        descriptive_attempted: descriptiveAttempted,
        descriptive_pending_grading: descriptivePendingGrading,
        marks_obtained: marksObtained,
        max_marks: maxMarks,
        sections: Object.entries(sectionStats).map(([section, stats]) => ({
          section,
          ...stats,
        })),
      };
    })();

    res.json({
      attempt: {
        id: attempt._id,
        email: (attempt.user_id as any)?.email,
        full_name: (attempt.user_id as any)?.full_name,
        status: attempt.status,
        started_at: attempt.started_at,
        submitted_at: attempt.submitted_at,
        final_score: attempt.final_score,
        result: attempt.result,
        result_override: attempt.result_override,
        assessment_title: (attempt.assessment_id as any)?.title,
        total_marks: (attempt.assessment_id as any)?.total_marks,
      },
      answers: formattedAnswers,
      analytics,
    });
  } catch (error) {
    console.error("❌ getAttemptDetails error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getDescriptiveAnswers(req: Request, res: Response) {
  try {
    const { attemptId } = req.params;
    if (!requireObjectIdParam(res, "attemptId", attemptId)) {
      return;
    }

    const answers = await Answer.find({ attempt_id: attemptId })
      .populate({
        path: "question_id",
        select: "question_text question_type marks",
        match: { question_type: "descriptive" },
      })
      .lean();

    const filtered = answers
      .filter((a) => a.question_id !== null)
      .map((a) => ({
        id: a._id,
        question_text: (a.question_id as any)?.question_text,
        answer_text: a.answer_text,
        answer: a.answer_text,
        marks: (a.question_id as any)?.marks,
      }));

    res.json(filtered);
  } catch (error) {
    console.error("❌ getDescriptiveAnswers error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function gradeDescriptiveAnswer(req: Request, res: Response) {
  try {
    const { answerId, marks } = req.body;

    if (!answerId || marks === undefined) {
      return res
        .status(400)
        .json({ message: "answerId and marks are required" });
    }
    if (!requireObjectIdParam(res, "answerId", answerId)) {
      return;
    }

    const numericMarks = Number(marks);
    if (!Number.isFinite(numericMarks)) {
      return res.status(400).json({ message: "marks must be a valid number" });
    }

    const existingAnswer = await Answer.findById(answerId).populate({
      path: "question_id",
      select: "marks question_type",
    });

    if (!existingAnswer) {
      return res.status(404).json({ message: "Answer not found" });
    }

    const question = existingAnswer.question_id as any;
    const maxMarks = Number(question?.marks);
    const questionType = String(question?.question_type || "").toLowerCase();

    if (!Number.isFinite(maxMarks)) {
      return res.status(500).json({ message: "Question max marks is invalid" });
    }
    if (questionType !== "descriptive") {
      return res.status(400).json({ message: "Only descriptive answers can be graded manually" });
    }
    if (numericMarks < 0 || numericMarks > maxMarks) {
      return res.status(400).json({ message: `marks must be between 0 and ${maxMarks}` });
    }

    const answer = await Answer.findByIdAndUpdate(
      answerId,
      {
        marks_obtained: numericMarks,
        is_graded: true,
      },
      { new: true }
    );

    if (!answer) {
      return res.status(404).json({ message: "Answer not found" });
    }

    const finalization = await finalizeAttemptIfComplete(
      answer.attempt_id.toString()
    );

    res.json({
      message: "Answer graded successfully",
      finalized: finalization.finalized,
      result: finalization.result ?? null,
    });
  } catch (error) {
    console.error("❌ gradeDescriptiveAnswer error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function publishResult(req: Request, res: Response) {
  try {
    const { attemptId } = req.params;
    if (!requireObjectIdParam(res, "attemptId", attemptId)) {
      return;
    }

    const attempt = await Attempt.findById(attemptId);

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (!attempt.result) {
      return res.status(409).json({
        message: "Attempt not finalized yet",
      });
    }

    if (attempt.is_published) {
      return res.status(409).json({
        message: "Result already published",
      });
    }

    await Attempt.findByIdAndUpdate(attemptId, {
      is_published: true,
    });

    res.json({
      message: "Result published successfully",
    });
  } catch (error) {
    console.error("❌ publishResult error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function overrideAttemptResult(req: Request, res: Response) {
  try {
    const { attemptId } = req.params;
    if (!requireObjectIdParam(res, "attemptId", attemptId)) {
      return;
    }

    const requestedResult = String(req.body?.result || "").trim().toUpperCase();
    const clearOverride = Boolean(req.body?.clearOverride);

    if (!clearOverride && requestedResult !== "PASS" && requestedResult !== "FAIL") {
      return res.status(400).json({ message: "result must be PASS or FAIL" });
    }

    const outcome = await setManualResultOverride(
      attemptId,
      clearOverride ? null : (requestedResult as "PASS" | "FAIL")
    );

    return res.json({
      message: clearOverride
        ? "Manual result cleared and recalculated successfully"
        : "Manual result updated successfully",
      result: outcome.result,
      source: outcome.source,
    });
  } catch (error: any) {
    console.error("overrideAttemptResult error:", error);
    return res.status(500).json({ message: error?.message || "Internal server error" });
  }
}

export async function deleteAttempt(req: Request, res: Response) {
  try {
    const { attemptId } = req.params;
    if (!requireObjectIdParam(res, "attemptId", attemptId)) {
      return;
    }

    const deleteResult = await Attempt.deleteOne({ _id: attemptId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    await Promise.all([
      Answer.deleteMany({ attempt_id: attemptId }),
      Violation.deleteMany({ attempt_id: attemptId }),
    ]);

    res.json({ message: "Attempt deleted successfully" });
  } catch (error) {
    console.error("❌ deleteAttempt error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteAllAttemptsByAssessment(req: Request, res: Response) {
  try {
    const { assessmentId } = req.params;
    if (!requireObjectIdParam(res, "assessmentId", assessmentId)) {
      return;
    }

    const attempts = await Attempt.find({ assessment_id: assessmentId })
      .select("_id")
      .lean();
    const attemptIds = attempts.map((a) => a._id);

    if (attemptIds.length > 0) {
      await Promise.all([
        Answer.deleteMany({ attempt_id: { $in: attemptIds } }),
        Violation.deleteMany({ attempt_id: { $in: attemptIds } }),
      ]);
    }

    const deleteResult = await Attempt.deleteMany({ assessment_id: assessmentId });

    res.json({
      message: "All attempts deleted successfully",
      count: deleteResult.deletedCount ?? 0,
    });
  } catch (error) {
    console.error("❌ deleteAllAttemptsByAssessment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteAssessment(req: Request, res: Response) {
  try {
    const { assessmentId } = req.params;
    if (!requireObjectIdParam(res, "assessmentId", assessmentId)) {
      return;
    }

    const assessment = await Assessment.findById(assessmentId).select("_id").lean();
    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    const attempts = await Attempt.find({ assessment_id: assessmentId })
      .select("_id")
      .lean();
    const attemptIds = attempts.map((a) => a._id);

    if (attemptIds.length > 0) {
      await Promise.all([
        Answer.deleteMany({ attempt_id: { $in: attemptIds } }),
        Violation.deleteMany({ attempt_id: { $in: attemptIds } }),
      ]);
      await Attempt.deleteMany({ assessment_id: assessmentId });
    }

    await Question.deleteMany({ assessment_id: assessmentId });
    await Assessment.deleteOne({ _id: assessmentId });

    res.json({ message: "Assessment deleted successfully" });
  } catch (error) {
    console.error("❌ deleteAssessment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function publishAllResults(req: Request, res: Response) {
  try {
    const assessmentId = req.params.assessmentId;

    if (!assessmentId) {
      return res.status(400).json({
        message: "Invalid or missing assessmentId",
      });
    }
    if (!requireObjectIdParam(res, "assessmentId", assessmentId)) {
      return;
    }

    const result = await Attempt.updateMany(
      {
        assessment_id: assessmentId,
        result: { $ne: null },
        is_published: false,
      },
      { is_published: true }
    );

    res.json({
      message: `${result.modifiedCount} results published successfully`,
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error("❌ publishAllResults error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function createAssessment(req: AuthRequest, res: Response) {
  try {
    const { title, duration_minutes, total_marks, pass_percentage, code } =
      req.body;

    if (!title || !duration_minutes) {
      return res
        .status(400)
        .json({ message: "Title and duration are required" });
    }

    const assessmentCode =
      code || Math.random().toString(36).substring(2, 8).toUpperCase();
    const duration = duration_minutes || 60;

    const assessment = await Assessment.create({
      creator_id: req.user!.userId,
      title,
      duration_minutes: duration,
      total_marks: total_marks || 0,
      pass_percentage: pass_percentage || 40,
      is_active: true,
      code: assessmentCode,
    });

    res.status(201).json({
      message: "Assessment created successfully",
      assessmentId: assessment._id,
      code: assessment.code,
    });
  } catch (error) {
    console.error("❌ createAssessment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateAssessment(req: Request, res: Response) {
  try {
    const { assessmentId } = req.params;
    if (!requireObjectIdParam(res, "assessmentId", assessmentId)) {
      return;
    }
    const { title, duration_minutes, pass_percentage, status } = req.body;

    const updateData: any = {};
    if (title) updateData.title = title;
    if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes;
    if (pass_percentage !== undefined) updateData.pass_percentage = pass_percentage;
    if (status !== undefined) {
      const normalizedStatus =
        typeof status === "string"
          ? ["active", "true", "1"].includes(status.toLowerCase())
          : typeof status === "boolean"
            ? status
            : null;
      if (normalizedStatus !== null) {
        updateData.is_active = normalizedStatus;
      }
    }

    const shouldRecalculateResults = pass_percentage !== undefined;

    const result = await Assessment.findByIdAndUpdate(
      assessmentId,
      updateData,
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    const recalculation = shouldRecalculateResults
      ? await recalculateAssessmentResults(assessmentId)
      : null;

    res.json({
      message: "Assessment updated successfully",
      recalculation,
    });
  } catch (error) {
    console.error("❌ updateAssessment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function processQuestionPayload(payload: any): Promise<any> {
  let { question_text, question_type, marks, correct_answer, options, section } =
    payload;

  if (!question_text || !question_type || marks === undefined) {
    throw new Error("Missing required fields");
  }

  const normalizedType = normalizeQuestionType(question_type);
  if (!normalizedType) {
    throw new Error("question_type must be mcq or descriptive");
  }

  const normalizedSection = normalizeSection(section || "Quantitative");
  if (!normalizedSection || !ALLOWED_SECTIONS.has(normalizedSection)) {
    throw new Error("section must be Quantitative, Verbal, Coding, or Logical");
  }

  const numericMarks = Number(marks);
  if (!Number.isFinite(numericMarks) || numericMarks <= 0) {
    throw new Error("marks must be a positive number");
  }

  if (String(question_type).toLowerCase() === "mcq" && correct_answer && options) {
    let optionsObj: { [key: string]: string } = {};

    if (Array.isArray(options)) {
      const keys = ["a", "b", "c", "d", "e", "f"];
      options.forEach((opt: string, index: number) => {
        optionsObj[keys[index]] = opt;
      });
      options = optionsObj;
    } else {
      optionsObj = options;
    }

    if (!Object.keys(optionsObj).includes(correct_answer)) {
      const correctKey = Object.keys(optionsObj).find(
        (key) => optionsObj[key] === correct_answer
      );
      if (correctKey) {
        correct_answer = correctKey;
      } else {
        throw new Error("Correct answer not found in options");
      }
    }
  }

  return {
    question_text: String(question_text),
    question_type: normalizedType,
    marks: numericMarks,
    correct_answer:
      normalizedType === "descriptive"
        ? String(correct_answer ?? "").trim() || null
        : (correct_answer ?? null),
    options: normalizedType === "mcq" ? (options ?? null) : null,
    section: normalizedSection,
  };
}

export async function addQuestion(req: Request, res: Response) {
  try {
    const { assessmentId } = req.params;
    if (!requireObjectIdParam(res, "assessmentId", assessmentId)) {
      return;
    }

    const assessmentExists = await Assessment.findById(assessmentId);
    if (!assessmentExists) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    const processed = await processQuestionPayload(req.body);

    const question = await Question.create({
      assessment_id: assessmentId,
      ...processed,
    });

    const totalMarks = await Question.aggregate([
      { $match: { assessment_id: new mongoose.Types.ObjectId(assessmentId) } },
      { $group: { _id: null, total: { $sum: "$marks" } } },
    ]);

    const total = totalMarks[0]?.total || 0;
    await Assessment.findByIdAndUpdate(assessmentId, {
      total_marks: total,
    });

    res.status(201).json({
      message: "Question added successfully",
      questionId: question._id,
    });
  } catch (error: any) {
    console.error("❌ addQuestion error:", error);
    const message =
      error?.message || "Internal server error";
    res.status(400).json({ message });
  }
}

export async function bulkAddQuestions(req: Request, res: Response) {
  try {
    const { assessmentId } = req.params;
    if (!requireObjectIdParam(res, "assessmentId", assessmentId)) {
      return;
    }
    const questions = req.body;

    if (!Array.isArray(questions)) {
      return res
        .status(400)
        .json({ message: "Payload must be an array of questions" });
    }

    const assessmentExists = await Assessment.findById(assessmentId);
    if (!assessmentExists) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    const processedQuestions = [];
    for (const q of questions) {
      try {
        const processed = await processQuestionPayload(q);
        processedQuestions.push({
          assessment_id: assessmentId,
          ...processed,
        });
      } catch (error: any) {
        console.warn(`Skipping invalid question: ${error.message}`);
        continue;
      }
    }

    if (processedQuestions.length === 0) {
      return res
        .status(400)
        .json({ message: "No valid questions to add" });
    }

    await Question.insertMany(processedQuestions);

    const totalMarks = await Question.aggregate([
      { $match: { assessment_id: new mongoose.Types.ObjectId(assessmentId) } },
      { $group: { _id: null, total: { $sum: "$marks" } } },
    ]);

    const total = totalMarks[0]?.total || 0;
    await Assessment.findByIdAndUpdate(assessmentId, {
      total_marks: total,
    });

    res.status(201).json({
      message: `${processedQuestions.length} questions added successfully`,
    });
  } catch (error: any) {
    console.error("❌ bulkAddQuestions error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getAssessmentQuestions(req: Request, res: Response) {
  try {
    const { assessmentId } = req.params;
    if (!requireObjectIdParam(res, "assessmentId", assessmentId)) {
      return;
    }

    const questions = await Question.find({ assessment_id: assessmentId })
      .sort({ section: 1, created_at: 1 })
      .lean();

    const formatted = questions.map((q) => ({
      id: q._id,
      question_text: q.question_text,
      question_type: q.question_type,
      marks: q.marks,
      correct_answer: q.correct_answer,
      section: q.section,
      options:
        q.question_type === "mcq" && q.options
          ? Array.isArray(q.options)
            ? q.options.map((text: string, idx: number) => ({
                id: String.fromCharCode(97 + idx),
                text,
              }))
            : Object.entries(q.options).map(([id, text]) => ({
                id,
                text,
              }))
          : null,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("❌ getAssessmentQuestions error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteQuestion(req: Request, res: Response) {
  try {
    const { assessmentId, questionId } = req.params;
    if (!requireObjectIdParam(res, "assessmentId", assessmentId)) {
      return;
    }
    if (!requireObjectIdParam(res, "questionId", questionId)) {
      return;
    }

    const question = await Question.findOne({
      _id: questionId,
      assessment_id: assessmentId,
    });

    if (!question) {
      return res
        .status(404)
        .json({ message: "Question not found in this assessment" });
    }

    await Question.deleteOne({ _id: questionId });

    const totalMarks = await Question.aggregate([
      { $match: { assessment_id: new mongoose.Types.ObjectId(assessmentId) } },
      { $group: { _id: null, total: { $sum: "$marks" } } },
    ]);

    const total = totalMarks[0]?.total || 0;
    await Assessment.findByIdAndUpdate(assessmentId, {
      total_marks: total,
    });

    res.json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error("❌ deleteQuestion error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteAllQuestions(req: Request, res: Response) {
  try {
    const { assessmentId } = req.params;
    if (!requireObjectIdParam(res, "assessmentId", assessmentId)) {
      return;
    }

    await Question.deleteMany({ assessment_id: assessmentId });

    await Assessment.findByIdAndUpdate(assessmentId, {
      total_marks: 0,
    });

    res.json({ message: "All questions deleted successfully" });
  } catch (error) {
    console.error("❌ deleteAllQuestions error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getCandidates(req: Request, res: Response) {
  try {
    const candidates = await User.find({ role: "CANDIDATE" })
      .select("_id email full_name created_at")
      .sort({ created_at: -1 });

    const formatted = candidates.map((c) => ({
      id: c._id,
      email: c.email,
      full_name: c.full_name,
      created_at: c.created_at,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("❌ getCandidates error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function addCandidate(req: Request, res: Response) {
  try {
    const { email, full_name } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const candidate = await User.create({
      email,
      full_name: full_name || "",
      role: "CANDIDATE",
      password_hash: "candidate_placeholder", // password_hash is required by schema
    });

    res.status(201).json({
      message: "Candidate added successfully",
      candidateId: candidate._id,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "Candidate already exists" });
    }
    console.error("❌ addCandidate error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function bulkAddCandidates(req: Request, res: Response) {
  try {
    const { candidates } = req.body;

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res
        .status(400)
        .json({ message: "Invalid or empty candidates list" });
    }

    const insertedIds = [];
    let skipCount = 0;

    for (const candidate of candidates) {
      const { email, full_name } = candidate;
      if (!email) continue;

      try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          skipCount++;
          continue;
        }

        const newCandidate = await User.create({
          email,
          full_name: full_name || "",
          role: "CANDIDATE",
          password_hash: "candidate_placeholder", // password_hash is required by schema
        });

        insertedIds.push(newCandidate._id);
      } catch (err) {
        console.error(`❌ Error inserting candidate ${email}:`, err);
        skipCount++;
      }
    }

    res.status(201).json({
      message: "Bulk upload completed",
      insertedCount: insertedIds.length,
      skippedCount: skipCount,
    });
  } catch (error) {
    console.error("❌ bulkAddCandidates error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getDashboardStats(req: Request, res: Response) {
  try {
    const totalAssessments = await Assessment.countDocuments();
    const totalCandidates = await User.countDocuments({ role: "CANDIDATE" });
    const totalAttempts = await Attempt.countDocuments();
    const totalPass = await Attempt.countDocuments({ result: "PASS" });
    const totalFail = await Attempt.countDocuments({ result: "FAIL" });

    const assessmentStats = await Attempt.aggregate([
      {
        $group: {
          _id: "$assessment_id",
          total_attempts: { $sum: 1 },
          pass_count: {
            $sum: { $cond: [{ $eq: ["$result", "PASS"] }, 1, 0] },
          },
          fail_count: {
            $sum: { $cond: [{ $eq: ["$result", "FAIL"] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "assessments",
          localField: "_id",
          foreignField: "_id",
          as: "assessment",
        },
      },
      {
        $unwind: "$assessment",
      },
      {
        $project: {
          id: "$_id",
          title: "$assessment.title",
          total_attempts: 1,
          pass_count: 1,
          fail_count: 1,
        },
      },
    ]);

    const recentResults = await Attempt.find()
      .populate({
        path: "user_id",
        select: "email full_name",
      })
      .populate({
        path: "assessment_id",
        select: "title",
      })
      .select("_id user_id assessment_id final_score result started_at")
      .sort({ started_at: -1 })
      .limit(10)
      .lean();

    const formatted = recentResults.map((a) => ({
      id: a._id,
      email: (a.user_id as any)?.email,
      full_name: (a.user_id as any)?.full_name,
      assessment_title: (a.assessment_id as any)?.title,
      final_score: a.final_score,
      result: a.result,
      started_at: a.started_at,
    }));

    res.json({
      summary: {
        total_assessments: totalAssessments,
        total_candidates: totalCandidates,
        total_attempts: totalAttempts,
        total_pass: totalPass,
        total_fail: totalFail,
      },
      assessmentStats,
      recentResults: formatted,
    });
  } catch (error: any) {
    console.error("❌ getDashboardStats error:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

export async function deleteCandidate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!requireObjectIdParam(res, "id", id)) {
      return;
    }
    await User.deleteOne({ _id: id, role: "CANDIDATE" });
    res.json({ message: "Candidate deleted successfully" });
  } catch (error) {
    console.error("❌ deleteCandidate error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function bulkDeleteCandidates(req: Request, res: Response) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Invalid or empty ID list" });
    }

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({ message: "Invalid ID list" });
    }

    await User.deleteMany({
      _id: { $in: validIds },
      role: "CANDIDATE",
    });
    res.json({ message: "Candidates deleted successfully" });
  } catch (error) {
    console.error("❌ bulkDeleteCandidates error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /api/admin/admins
 */
export async function getAdmins(req: Request, res: Response) {
  try {
    const admins = await User.find({ role: "ADMIN" })
      .select("_id email full_name created_at")
      .sort({ created_at: -1 });

    const formatted = admins.map((a) => ({
      id: a._id,
      email: a.email,
      full_name: a.full_name,
      created_at: a.created_at,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("❌ getAdmins error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * POST /api/admin/admins
 */
export async function addAdmin(req: Request, res: Response) {
  try {
    const { email, full_name } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const admin = await User.create({
      email,
      full_name: full_name || "",
      role: "ADMIN",
      password_hash: "admin_placeholder", // password_hash is required by schema
    });

    res.status(201).json({
      message: "Admin added successfully",
      adminId: admin._id,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "User already exists" });
    }
    console.error("❌ addAdmin error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * DELETE /api/admin/admins/:id
 */
export async function deleteAdmin(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ message: "Admin deleted successfully" });
  } catch (error) {
    console.error("❌ deleteAdmin error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
