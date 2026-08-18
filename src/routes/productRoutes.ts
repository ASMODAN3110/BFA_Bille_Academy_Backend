// Routes publiques Module 8 — Catalogue produits — BFA Bille Football Academy
// GET /api/products     → liste paginée (filtres ?categorie= & ?estNouveau=)
// GET /api/products/:id → détail d'un produit (404 si absent)

import { Router } from "express";
import { getProductByIdPublic, getPublicProducts } from "../controllers/shopController";

const router = Router();

router.get("/", getPublicProducts);
router.get("/:id", getProductByIdPublic);

export default router;
