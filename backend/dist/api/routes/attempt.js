"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attempt_controller_1 = require("../controllers/attempt.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.post("/start", auth_middleware_1.requireAuth, role_middleware_1.requireCandidate, attempt_controller_1.startAttempt);
exports.default = router;
