// Routes publiques Module 2 — Événements — BFA Bille Football Academy
// GET /api/events      → liste filtrée/paginée (@EF8/@EF9/@EF10)
// GET /api/events/:id  → fiche détaillée

import { Router } from "express";
import { getAll, getById } from "../controllers/eventController";

const router = Router();

router.get("/", getAll);
router.get("/:id", getById);

export default router;
