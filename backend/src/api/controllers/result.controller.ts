import { Request, Response } from "express";
import Attempt from "../../models/Attempt";
import Assessment from "../../models/Assessment";
import { AuthRequest } from "../middlewares/auth.middleware";

export async function getMyResults(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const attempts = await Attempt.find({ user_id: userId })
      .populate({
        path: "assessment_id",
        select: "title total_marks",
      })
      .sort({ submitted_at: -1 });

    const results = attempts.map((attempt) => ({
      attempt_id: attempt._id,
      title: (attempt.assessment_id as any)?.title,
      final_score: attempt.is_published ? attempt.final_score : null,
      total_marks: (attempt.assessment_id as any)?.total_marks,
      result: attempt.is_published ? attempt.result : null,
      is_published: attempt.is_published,
      submitted_at: attempt.submitted_at,
    }));

    res.json(results);
  } catch (error) {
    console.error("❌ getMyResults error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
