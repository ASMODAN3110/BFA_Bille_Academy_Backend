// Routes publiques Module 6 — Blog d'actualités — BFA Bille Football Academy
// GET /api/blog     → articles publiés (tri datePublication desc, pagination)
// GET /api/blog/:id → détail d'un article publié (404 si absent ou brouillon)

import { Router } from "express";
import { getPublic, getPublicById } from "../controllers/blogController";

const router = Router();

router.get("/", getPublic);
router.get("/:id", getPublicById);

export default router;
