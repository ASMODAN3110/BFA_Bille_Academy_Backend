// Routes protégées Module 6 — Gestion du blog — BFA Bille Football Academy
// GET    /admin/blog       → liste (publiés + brouillons), filtres ?page&limit&categorie&estPublie&recherche
// GET    /admin/blog/:id   → détail par id (quel que soit le statut)
// POST   /admin/blog       → création → 201
// PUT    /admin/blog/:id   → remplacement complet
// PATCH  /admin/blog/:id   → mise à jour partielle (dont estPublie → publication/dépublication)
// DELETE /admin/blog/:id   → suppression → 200 message
// La protection `authenticate` est appliquée au montage dans `src/app.ts` (convention du projet).

import { Router } from "express";
import {
  create,
  getAll,
  getById,
  patch,
  remove,
  update,
} from "../controllers/blogController";

const router = Router();

router.get("/", getAll);
router.get("/:id", getById);
router.post("/", create);
router.put("/:id", update);
router.patch("/:id", patch);
router.delete("/:id", remove);

export default router;
