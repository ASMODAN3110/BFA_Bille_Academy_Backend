// Routes protégées Module 1 — Gestion des catégories — BFA Bille Football Academy
// POST   /admin/categories      → création d'une catégorie
// PUT    /admin/categories/:id  → modification d'une catégorie
// DELETE /admin/categories/:id  → suppression d'une catégorie
// La protection `authenticate` est appliquée au montage dans `src/app.ts` (convention du projet).

import { Router } from "express";
import { create, remove, update } from "../controllers/categoryController";

const router = Router();

router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

export default router;
