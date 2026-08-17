// Routes publiques Module 3 — Demandes d'essai — BFA Bille Football Academy
// POST /api/trials → création d'une demande (@EF15/@EF16/@EF17)

import { Router } from "express";
import { create } from "../controllers/trialController";

const router = Router();

router.post("/", create);

export default router;
