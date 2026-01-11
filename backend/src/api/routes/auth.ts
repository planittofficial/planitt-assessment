import { Router } from "express";
import { login, me } from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.post("/login", login);
router.get("/me", requireAuth, me); // ✅ REQUIRED

export default router;
