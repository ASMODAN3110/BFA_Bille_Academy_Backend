// Routes protégées Module Media — Fichiers S3/MinIO — BFA Bille Football Academy
// POST   /admin/media/upload       → upload d'un fichier unique (champ `file`)
// POST   /admin/media/upload-many  → upload multiple (champ `files`, max 20)
// DELETE /admin/media              → suppression par `{ key }` ou `{ url }` (body)
// La protection `authenticate` est appliquée au montage dans `src/app.ts` (convention du projet).

import { Router } from "express";
import { remove, upload, uploadMultiple } from "../controllers/mediaController";
import { uploadMany, uploadSingle } from "../middlewares/uploadMiddleware";

const router = Router();

router.post("/upload", uploadSingle, upload);
router.post("/upload-many", uploadMany, uploadMultiple);
router.delete("/", remove);

export default router;
