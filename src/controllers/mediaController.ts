// Contrôleur Module Media — Upload / suppression de fichiers S3/MinIO
// POST   /admin/media/upload       → upload d'un fichier unique (champ `file`)
// POST   /admin/media/upload-many  → upload multiple (champ `files`, max 20)
// DELETE /admin/media              → suppression par `{ key }` ou `{ url }` (body)
// Accessibles au back-office uniquement : `authenticate` est appliqué au montage
// dans `src/app.ts` (convention du projet). Le champ form `dossier` détermine le
// préfixe de la clé (joueurs, galerie, blog, boutique).
//
// Les contrôleurs d'entités (joueurs, albums, articles, produits) ne changent pas :
// ils reçoivent l'URL publique renvoyée ici et la stockent telle quelle.

import type { Request, Response } from "express";
import { BUCKET, S3_PUBLIC_URL } from "../config/s3";
import { estDossierValide } from "../middlewares/uploadMiddleware";
import {
  deleteFile,
  uploadFile,
  uploadMany as uploadManyFichiers,
} from "../services/storageService";

const DOSSIERS_LABEL = "joueurs, galerie, blog, boutique";

/**
 * POST /admin/media/upload — Upload d'un fichier unique.
 * Form : champ `file` (binaire) + champ `dossier` (texte, obligatoire).
 * Retourne 201 `{ key, url }` — l'URL est à envoyer dans `photo`/`image`/`medias`.
 */
export async function upload(req: Request, res: Response): Promise<void> {
  const dossier = (req.body ?? {}).dossier;
  if (!estDossierValide(dossier)) {
    res.status(400).json({
      success: false,
      message: `Le dossier doit être l'un des suivants : ${DOSSIERS_LABEL}.`,
    });
    return;
  }

  if (!req.file) {
    res.status(400).json({ success: false, message: "Aucun fichier reçu (champ 'file')." });
    return;
  }

  const media = await uploadFile({
    dossier,
    fichier: {
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
    },
  });

  res.status(201).json({ success: true, data: media });
}

/**
 * POST /admin/media/upload-many — Upload multiple (albums, galeries).
 * Form : champ `files` (binaires, 20 max) + champ `dossier` (texte, obligatoire).
 * Retourne 201 `[{ key, url }, ...]` dans l'ordre reçu.
 */
export async function uploadMultiple(req: Request, res: Response): Promise<void> {
  const dossier = (req.body ?? {}).dossier;
  if (!estDossierValide(dossier)) {
    res.status(400).json({
      success: false,
      message: `Le dossier doit être l'un des suivants : ${DOSSIERS_LABEL}.`,
    });
    return;
  }

  if (!Array.isArray(req.files) || req.files.length === 0) {
    res.status(400).json({ success: false, message: "Aucun fichier reçu (champ 'files')." });
    return;
  }

  const medias = await uploadManyFichiers({
    dossier,
    fichiers: req.files.map((f) => ({
      buffer: f.buffer,
      mimetype: f.mimetype,
      originalname: f.originalname,
    })),
  });

  res.status(201).json({ success: true, data: medias });
}

/**
 * DELETE /admin/media — Suppression d'un objet.
 * Body `{ key }` ou `{ url }` (l'URL publique est réduite à sa clé). Idempotent :
 * une clé absente de MinIO est traitée comme un succès.
 */
export async function remove(req: Request, res: Response): Promise<void> {
  const key = extraireCle((req.body ?? {}) as Record<string, unknown>);
  if (!key) {
    res.status(400).json({
      success: false,
      message: "Fournissez { key } ou { url } du fichier à supprimer.",
    });
    return;
  }

  await deleteFile(key);

  res.json({ success: true, message: "Fichier supprimé" });
}

/**
 * Extrait la clé S3 d'un body `{ key }` ou `{ url }` (URL publique → clé).
 * L'URL publique a la forme `S3_PUBLIC_URL/bfa-media/<dossier>/<fichier>` : on retire
 * le préfixe origine + bucket pour retrouver la clé. Une URL qui ne correspond pas à
 * ce schéma est acceptée telle quelle (utile pour une clé déjà transmise seule).
 */
function extraireCle(body: Record<string, unknown>): string | null {
  if (typeof body.key === "string" && body.key.trim() !== "") {
    return body.key.trim();
  }
  if (typeof body.url === "string" && body.url.trim() !== "") {
    const url = body.url.trim();
    const prefix = `${S3_PUBLIC_URL}/${BUCKET}/`;
    return url.startsWith(prefix) ? url.slice(prefix.length) : url;
  }
  return null;
}
