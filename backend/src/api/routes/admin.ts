import {
  getAssessments,
  getAssessmentById,
  getAttemptsByAssessment,
  getViolationsByAttempt,
  getAttemptSummary,
  getDescriptiveAnswers,
  getAttemptDetails,
  gradeDescriptiveAnswer,
  publishResult,
  overrideAttemptResult,
  deleteAttempt,
  deleteAllAttemptsByAssessment,
  deleteAssessment,
  publishAllResults,
  createAssessment,
  updateAssessment,
  addQuestion,
  bulkAddQuestions,
  getAssessmentQuestions,
  deleteQuestion,
  deleteAllQuestions,
  getCandidates,
  addCandidate,
  bulkAddCandidates,
  deleteCandidate,
  bulkDeleteCandidates,
  getDashboardStats,
  getAdmins,
  addAdmin,
  deleteAdmin,
} from "../controllers/admin.controller";
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/role.middleware";
const router = Router();

/**
 * All admin routes are protected here
 */
router.use(requireAuth, requireAdmin);

router.get("/assessments", getAssessments);
router.get("/assessments/:assessmentId", getAssessmentById);
router.get("/assessments/:assessmentId/questions", getAssessmentQuestions);
router.get("/assessments/:assessmentId/attempts", getAttemptsByAssessment);
router.get("/attempts/:attemptId", getAttemptSummary);
router.get("/attempts/:attemptId/details", getAttemptDetails);
router.get("/attempts/:attemptId/violations", getViolationsByAttempt);
router.get("/attempts/:attemptId/descriptive", getDescriptiveAnswers);
router.post("/answers/grade", gradeDescriptiveAnswer);
router.post("/attempts/:attemptId/publish", publishResult);
router.post("/attempts/:attemptId/result", overrideAttemptResult);
router.delete("/attempts/:attemptId", deleteAttempt);
router.post("/attempts/:attemptId/delete", deleteAttempt);
router.delete("/assessments/:assessmentId/attempts/:attemptId", deleteAttempt);
router.post("/assessments/:assessmentId/attempts/:attemptId/delete", deleteAttempt);
router.delete("/assessments/:assessmentId/attempts", deleteAllAttemptsByAssessment);
router.post("/assessments/:assessmentId/attempts/delete", deleteAllAttemptsByAssessment);
router.post("/assessments/:assessmentId/publish-all", publishAllResults);

router.post("/assessments", createAssessment);
router.patch("/assessments/:assessmentId", updateAssessment);
router.delete("/assessments/:assessmentId", deleteAssessment);
router.post("/assessments/:assessmentId/delete", deleteAssessment);
router.post("/assessments/:assessmentId/questions", addQuestion);
router.post("/assessments/:assessmentId/questions/bulk", bulkAddQuestions);
router.delete("/assessments/:assessmentId/questions/:questionId", deleteQuestion);
router.delete("/assessments/:assessmentId/questions", deleteAllQuestions);

router.get("/candidates", getCandidates);
router.post("/candidates", addCandidate);
router.post("/candidates/bulk", bulkAddCandidates);
router.delete("/candidates/:id", deleteCandidate);
router.post("/candidates/bulk-delete", bulkDeleteCandidates);
router.get("/dashboard-stats", getDashboardStats);

router.get("/admins", getAdmins);
router.post("/admins", addAdmin);
router.delete("/admins/:id", deleteAdmin);

export default router;
