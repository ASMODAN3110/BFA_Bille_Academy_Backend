// Routes protégées Module 2 — Gestion des événements — BFA Bille Football Academy
// POST   /admin/events      → création (@EF11/@EF12)
// PUT    /admin/events/:id  → modification (@EF13)
// DELETE /admin/events/:id  → suppression (@EF14)
// La protection `authenticate` est appliquée au montage dans `src/app.ts` (convention du projet).

import { Router } from "express";
import { create, remove, update } from "../controllers/eventController";

const router = Router();

router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

export default router;
