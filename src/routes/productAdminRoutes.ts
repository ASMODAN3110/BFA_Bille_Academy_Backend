// Routes protégées Module 8 — Gestion des produits — BFA Bille Football Academy
// GET    /admin/products     → liste paginée
// GET    /admin/products/:id → détail par id
// POST   /admin/products     → création → 201 (multipart : champ `file` + champs, `tailles` en chaîne JSON ; ou JSON)
// PUT    /admin/products/:id → remplacement complet (si nouvelle image, l'ancienne S3 est supprimée)
// DELETE /admin/products/:id → suppression → 200 message (jamais 204) + suppression image S3
// La protection `authenticate` est appliquée au montage dans `src/app.ts` (convention du projet).
// Le routeur admin inclut TOUJOURS les GET (liste + détail) pour le back-office.

import { Router } from "express";
import { uploadSingle } from "../middlewares/uploadMiddleware";
import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  updateProduct,
} from "../controllers/shopController";

const router = Router();

router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/", uploadSingle, createProduct);
router.put("/:id", uploadSingle, updateProduct);
router.delete("/:id", deleteProduct);

export default router;
