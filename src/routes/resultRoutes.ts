// Routes publiques Module 7 — Résultats de matchs — BFA Bille Football Academy
// GET /api/results → liste paginée (tri date desc), filtre optionnel ?categorieId=

import { Router } from "express";
import { getPublic } from "../controllers/resultController";

const router = Router();

router.get("/", getPublic);

export default router;
