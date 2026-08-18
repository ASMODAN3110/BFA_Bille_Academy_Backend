// Routes protégées Module 8 — Gestion des devis — BFA Bille Football Academy
// GET    /admin/quotes         → liste paginée (tri dateDemande desc), filtre ?estTraite=
// GET    /admin/quotes/:id     → détail par id
// PUT    /admin/quotes/:id/treat → marque le devis traité + enregistre l'admin
// La protection `authenticate` est appliquée au montage dans `src/app.ts`.

import { Router } from "express";
import { getQuoteById, getQuotes, markQuoteAsTreated } from "../controllers/shopController";

const router = Router();

router.get("/", getQuotes);
router.get("/:id", getQuoteById);
router.put("/:id/treat", markQuoteAsTreated);

export default router;
