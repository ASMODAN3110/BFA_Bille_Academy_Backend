// Routes d'authentification — BFA Bille Football Academy
// POST /api/auth/login  → connexion admin (@EF46, @EF47)
// POST /api/auth/logout → déconnexion (@EF49)
// GET  /api/auth/me     → validation de session (token Bearer requis)

import { Router } from "express";
import { login, logout, me } from "../controllers/authController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authenticate, me);

export default router;
