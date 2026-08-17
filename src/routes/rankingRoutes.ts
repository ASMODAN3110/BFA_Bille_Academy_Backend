// Routes publiques Module 7 — Classements — BFA Bille Football Academy
// GET /api/rankings/:categorieId → classement de la catégorie
//   (tri points desc, puis victoires desc ; `position` incluse)

import { Router } from "express";
import { getRankings } from "../controllers/resultController";

const router = Router();

router.get("/:categorieId", getRankings);

export default router;
