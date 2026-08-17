// Middleware d'upload multipart — BFA Bille Football Academy
// Multer en mémoire (memoryStorage) : fichiers ≤ 10 Mo, types JPG/PNG/MP4/WEBM.
// Le dossier (`joueurs`, `galerie`, `blog`, `boutique`) est validé côté contrôleur.
// Erreurs attendues traduites en réponses 400 françaises ; le reste remonte au
// middleware d'erreur de `app.ts`.
//
// NB : multer est en CJS — on passe par le default import (interop ESM/tsx) et on
// détecte ses erreurs par leur forme (`code`) plutôt que par `instanceof` (fragile
// entre les typages `@types/multer` et la valeur runtime).

import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ALLOWED_DOSSIERS, type Dossier } from "../services/storageService";

/** Erreur d'upload avec statut HTTP dédié (400 par défaut). */
export class UploadError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

const ALLOWED_MIMES = ["image/jpeg", "image/png", "video/mp4", "video/webm"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo

/** Vrai si `dossier` figure dans la liste autorisée (garde le préfixe de clé propre). */
export function estDossierValide(dossier: unknown): dossier is Dossier {
  return typeof dossier === "string" && (ALLOWED_DOSSIERS as readonly string[]).includes(dossier);
}

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      cb(new UploadError("Type de fichier non supporté (JPG, PNG, MP4, WEBM uniquement)."));
      return;
    }
    cb(null, true);
  },
});

/** Réduit une erreur inconnue à un objet `{ code }` si c'est une erreur multer. */
function estErreurMulter(err: unknown): err is { code: string; message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code?: unknown }).code === "string"
  );
}

/** Répond 400 si l'erreur est attendue ; sinon la délègue à `next` (500 générique). */
function gererErreurUpload(err: unknown, res: Response, next: NextFunction): boolean {
  if (err instanceof UploadError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return true;
  }
  if (estErreurMulter(err)) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ success: false, message: "Fichier trop volumineux (max 10 Mo)." });
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      res.status(400).json({ success: false, message: "Champ de fichier inattendu." });
    } else {
      res.status(400).json({ success: false, message: `Erreur d'upload : ${err.message}` });
    }
    return true;
  }
  next(err);
  return false;
}

type ExpressHandler = (req: Request, res: Response, next: NextFunction) => void;

/** Upload d'un fichier unique — champ `file`. */
export const uploadSingle: ExpressHandler = (req, res, next) => {
  uploader.single("file")(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    gererErreurUpload(err, res, next);
  });
};

/** Upload de plusieurs fichiers — champ `files`, 20 au maximum. */
export const uploadMany: ExpressHandler = (req, res, next) => {
  uploader.array("files", 20)(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    gererErreurUpload(err, res, next);
  });
};
