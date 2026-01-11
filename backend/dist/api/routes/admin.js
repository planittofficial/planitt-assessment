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
router.get("/assessments/:assessmentId/questions", admin_controller_1.getAssessmentQuestions);
router.get("/assessments/:assessmentId/attempts", auth_middleware_1.requireAuth, role_middleware_1.requireAdmin, admin_controller_1.getAttemptsByAssessment);
router.get("/attempts/:attemptId", admin_controller_1.getAttemptSummary);
router.get("/attempts/:attemptId/details", admin_controller_1.getAttemptDetails);
router.get("/attempts/:attemptId/violations", admin_controller_1.getViolationsByAttempt);
router.get("/attempts/:attemptId/descriptive", admin_controller_1.getDescriptiveAnswers);
router.post("/answers/grade", admin_controller_1.gradeDescriptiveAnswer);
router.post("/attempts/:attemptId/publish", admin_controller_1.publishResult);
router.post("/assessments", admin_controller_1.createAssessment);
router.post("/assessments/:assessmentId/questions", admin_controller_1.addQuestion);
router.post("/assessments/:assessmentId/questions/bulk", admin_controller_1.bulkAddQuestions);
exports.default = router;
