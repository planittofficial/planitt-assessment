"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_controller_1 = require("../controllers/admin.controller");
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const router = (0, express_1.Router)();
/**
 * All admin routes are protected here
 */
router.use(auth_middleware_1.requireAuth, role_middleware_1.requireAdmin);
router.get("/assessments", admin_controller_1.getAssessments);
router.get("/assessments/:assessmentId", admin_controller_1.getAssessmentById);
router.get("/assessments/:assessmentId/questions", admin_controller_1.getAssessmentQuestions);
router.get("/assessments/:assessmentId/attempts", admin_controller_1.getAttemptsByAssessment);
router.get("/attempts/:attemptId", admin_controller_1.getAttemptSummary);
router.get("/attempts/:attemptId/details", admin_controller_1.getAttemptDetails);
router.get("/attempts/:attemptId/violations", admin_controller_1.getViolationsByAttempt);
router.get("/attempts/:attemptId/descriptive", admin_controller_1.getDescriptiveAnswers);
router.post("/answers/grade", admin_controller_1.gradeDescriptiveAnswer);
router.post("/attempts/:attemptId/publish", admin_controller_1.publishResult);
router.post("/assessments/:assessmentId/publish-all", admin_controller_1.publishAllResults);
router.post("/assessments", admin_controller_1.createAssessment);
router.patch("/assessments/:assessmentId", admin_controller_1.updateAssessment);
router.post("/assessments/:assessmentId/questions", admin_controller_1.addQuestion);
router.post("/assessments/:assessmentId/questions/bulk", admin_controller_1.bulkAddQuestions);
router.delete("/assessments/:assessmentId/questions/:questionId", admin_controller_1.deleteQuestion);
router.delete("/assessments/:assessmentId/questions", admin_controller_1.deleteAllQuestions);
router.get("/candidates", admin_controller_1.getCandidates);
router.post("/candidates", admin_controller_1.addCandidate);
router.post("/candidates/bulk", admin_controller_1.bulkAddCandidates);
router.delete("/candidates/:id", admin_controller_1.deleteCandidate);
router.post("/candidates/bulk-delete", admin_controller_1.bulkDeleteCandidates);
router.get("/dashboard-stats", admin_controller_1.getDashboardStats);
exports.default = router;
