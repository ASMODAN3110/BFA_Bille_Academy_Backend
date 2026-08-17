// Routes publiques Module 4 — Albums — BFA Bille Football Academy
// GET /api/albums      → liste filtrée/paginée (@EF21)
// GET /api/albums/:id  → fiche détaillée, médias inclus (@EF20)

import { Router } from "express";
import { getAll, getById } from "../controllers/albumController";

const router = Router();

router.get("/", getAll);
router.get("/:id", getById);

export default router;
