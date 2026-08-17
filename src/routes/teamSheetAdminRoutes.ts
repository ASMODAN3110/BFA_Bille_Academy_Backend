// Routes protégées Module 5 — Gestion des fiches techniques — BFA Bille Football Academy
// GET    /admin/team-sheets                        → liste paginée (avec catégorie)
// GET    /admin/team-sheets/categorie/:categorieId → fiche d'une catégorie (@EF27)
// GET    /admin/team-sheets/:id                    → détail par id
// POST   /admin/team-sheets                        → création (409 si fiche existante) (@EF27)
// PUT    /admin/team-sheets/:id                    → remplacement complet (@EF27/@EF28)
// PATCH  /admin/team-sheets/:id                    → mise à jour partielle (@EF27/@EF28)
// DELETE /admin/team-sheets/:id                    → suppression → 200 message
// La protection `authenticate` est appliquée au montage dans `src/app.ts` (convention du projet).
// NB : `/categorie/:categorieId` est déclaré AVANT `/:id` (sinon Express fait matcher `/:id`).

import { Router } from "express";
import {
  create,
  getAll,
  getByCategorie,
  getById,
  patch,
  remove,
  update,
} from "../controllers/teamSheetController";

const router = Router();

router.get("/", getAll);
router.get("/categorie/:categorieId", getByCategorie);
router.get("/:id", getById);
router.post("/", create);
router.put("/:id", update);
router.patch("/:id", patch);
router.delete("/:id", remove);

export default router;
