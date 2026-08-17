// Routes protégées Module 4 — Gestion des albums et médias — BFA Bille Football Academy
// POST   /admin/albums                            → création (@EF22)
// POST   /admin/albums/:id/media                  → upload de médias (@EF22/@EF23)
// PUT    /admin/albums/:id                        → modification (@EF22)
// DELETE /admin/albums/:id                        → suppression + fichiers S3 (@EF22)
// DELETE /admin/albums/:albumId/media/:mediaId    → suppression d'un média (@EF24)
// La protection `authenticate` est appliquée au montage dans `src/app.ts` (convention du projet).

import { Router } from "express";
import { uploadMany } from "../middlewares/uploadMiddleware";
import {
  create,
  deleteMedia,
  getAll,
  getById,
  remove,
  update,
  uploadMedia,
} from "../controllers/albumController";

const router = Router();

router.get("/", getAll);
router.get("/:id", getById);
router.post("/", create);
router.post("/:id/media", uploadMany, uploadMedia);
router.put("/:id", update);
router.delete("/:id", remove);
router.delete("/:albumId/media/:mediaId", deleteMedia);

export default router;
