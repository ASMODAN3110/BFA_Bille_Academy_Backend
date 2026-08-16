// Routes publiques Module 1 — Catégories — BFA Bille Football Academy
// GET /api/categories → liste des catégories (id, nom, ageMin, ageMax).

import { Router } from "express";
import { getAll } from "../controllers/categoryController";

const router = Router();

router.get("/", getAll);

export default router;
