// Routes protégées Module 7 — Gestion des résultats — BFA Bille Football Academy
// GET    /admin/results     → liste paginée (tous les résultats), filtre ?categorieId=
// GET    /admin/results/:id → détail par id
// POST   /admin/results     → création → 201 (recalcule le classement de la catégorie)
// PUT    /admin/results/:id → remplacement complet (recalcule ancienne + nouvelle catégorie si changement)
// DELETE /admin/results/:id → suppression → 200 message (jamais 204) + recalcul
// La protection `authenticate` est appliquée au montage dans `src/app.ts` (convention du projet).
// Le routeur admin inclut TOUJOURS les GET (liste + détail) pour le back-office.

import { Router } from "express";
import {
  create,
  getAll,
  getById,
  remove,
  update,
} from "../controllers/resultController";

const router = Router();

router.get("/", getAll);
router.get("/:id", getById);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

export default router;
