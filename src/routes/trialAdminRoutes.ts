// Routes protégées Module 3 — Demandes d'essai — BFA Bille Football Academy
// GET    /admin/trials              → liste paginée + filtre statut (@EF20)
// GET    /admin/trials/:id          → détail (@EF20)
// PUT    /admin/trials/:id/validate → confirmation (@EF18)
// PUT    /admin/trials/:id/refuse   → refus avec motif (@EF19)
// DELETE /admin/trials/:id          → suppression (@EF20)
// La protection `authenticate` est appliquée au montage dans `src/app.ts` (convention du projet).

import { Router } from "express";
import { detail, list, refuse, remove, validate } from "../controllers/trialController";

const router = Router();

router.get("/", list);
router.get("/:id", detail);
router.put("/:id/validate", validate);
router.put("/:id/refuse", refuse);
router.delete("/:id", remove);

export default router;
