import { Router } from "express";
import { getViolationCount, logViolation } from "../controllers/violation.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireCandidate } from "../middlewares/role.middleware";

const router = Router();

router.post("/log", requireAuth, requireCandidate, logViolation);
router.get("/:attemptId/count", requireAuth, requireCandidate, getViolationCount);

export default router;
