// Routes publiques Module 1 — Joueurs — BFA Bille Football Academy
// GET /api/players     → liste filtrée/paginée (@EF1)
// GET /api/players/:id → fiche détaillée (@EF2)

import { Router } from "express";
import { getAll, getById } from "../controllers/playerController";

const router = Router();

router.get("/", getAll);
router.get("/:id", getById);

export default router;
