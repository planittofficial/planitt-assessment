import { Router } from "express";
import { startAttempt, submitAttempt, getQuestions, saveAnswer } from "../controllers/attempt.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireCandidate } from "../middlewares/role.middleware";

const router = Router();

router.post("/start", requireAuth, requireCandidate, startAttempt);
router.post("/submit", requireAuth, requireCandidate, submitAttempt);
router.get("/:attemptId/questions", requireAuth, requireCandidate, getQuestions);
router.post("/:attemptId/answers", requireAuth, requireCandidate, saveAnswer);

export default router;
