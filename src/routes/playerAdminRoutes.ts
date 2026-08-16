// Routes protégées Module 1 — Gestion des joueurs — BFA Bille Football Academy
// POST   /admin/players      → création (@EF3/@EF4/@EF5)
// PUT    /admin/players/:id  → modification (@EF6)
// DELETE /admin/players/:id  → suppression (@EF7)
// La protection `authenticate` est appliquée au montage dans `src/app.ts` (convention du projet).

import { Router } from "express";
import { create, remove, update } from "../controllers/playerController";

const router = Router();

router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

export default router;
