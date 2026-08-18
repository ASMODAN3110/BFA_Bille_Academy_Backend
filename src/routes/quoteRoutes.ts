// Routes publiques Module 8 — Demandes de devis — BFA Bille Football Academy
// POST /api/quotes → création d'une demande de devis → 201 (téléphone obligatoire @EF43)

import { Router } from "express";
import { createQuote } from "../controllers/shopController";

const router = Router();

router.post("/", createQuote);

export default router;
