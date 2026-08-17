// Routes publiques Module 5 — Fiches techniques — BFA Bille Football Academy
// GET /api/team-sheets/categorie/:categorieId → fiche d'une catégorie + effectif (@EF25/@EF26)
// GET /api/team-sheets/:id                  → fiche par id, catégorie + effectif inclus (@EF25)
// NB : `/categorie/:categorieId` est déclaré AVANT `/:id` (sinon Express fait matcher `/:id`).

import { Router } from "express";
import { getByCategorie, getById } from "../controllers/teamSheetController";

const router = Router();

router.get("/categorie/:categorieId", getByCategorie);
router.get("/:id", getById);

export default router;
