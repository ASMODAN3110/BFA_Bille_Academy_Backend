// Routes publiques d'authentification — BFA Bille Football Academy
// POST /api/auth/login  → connexion admin (@EF46, @EF47)
// POST /api/auth/logout → déconnexion (@EF49)

import { Router } from "express";
import { login, logout } from "../controllers/authController";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);

export default router;
