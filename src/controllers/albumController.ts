// Contrôleur Module 4 — Albums et médias — BFA Bille Football Academy
// @EF20 : consultation publique (liste/détail, médias inclus)
// @EF21 : filtre thème · @EF22 : création/modification/suppression d'album + upload
// @EF23 : refus des formats non supportés (middleware d'upload) · @EF24 : suppression d'un média.
// Accès DB via le singleton centralisé dans `src/config/database.ts`.
// Express 5 : pas de wrapper async — le contrôleur répond explicitement pour les cas
// attendus (400/404) ; les erreurs inattendues remontent au middleware d'erreur de `app.ts`.
// Le service traduit ses codes en statuts : INTROUVABLE → 404, MEDIA_INTROUVABLE → 404.

import type { Request, Response } from "express";
import { THEMES_ALBUM, validateAlbumInput, type ThemeAlbum } from "../utils/albumValidator";
import {
  ajouterMedias,
  creerAlbum,
  listerAlbums,
  modifierAlbum,
  obtenirAlbum,
  supprimerAlbum,
  supprimerMedia,
} from "../services/albumService";

/**
 * Convertit un paramètre d'URL en entier positif ; renvoie 0 si invalide (<= 0 ou non entier).
 * Les types Express 5 typent `req.params.id` en `string | string[]` (paramètres répétables).
 */
function parseId(value: string | string[]): number {
  const v = Array.isArray(value) ? value[0] : value;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/**
 * GET /api/albums — Liste paginée des albums avec filtre thème optionnel (@EF21).
 * Query : `page` (défaut 1), `limit` (défaut 10, max 100), `theme` (l'un des 4 thèmes).
 * Tri `dateCreation` décroissante (les plus récents d'abord).
 */
export async function getAll(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? "10"), 10) || 10));

  const rawTheme = req.query.theme;
  if (rawTheme !== undefined && !THEMES_ALBUM.includes(rawTheme as ThemeAlbum)) {
    res.status(400).json({
      success: false,
      message: "Le filtre thème doit être Entraînements, Matchs, Événements ou Portraits",
    });
    return;
  }
  const theme = rawTheme !== undefined ? (rawTheme as ThemeAlbum) : undefined;

  const resultat = await listerAlbums({ page, limit, theme });
  res.json({ success: true, data: resultat.data });
}

/**
 * GET /api/albums/:id — Fiche détaillée d'un album, médias inclus (@EF20).
 */
export async function getById(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant d'album invalide" });
    return;
  }

  const resultat = await obtenirAlbum(id);
  if (!resultat.ok) {
    res.status(404).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, data: resultat.data });
}

/**
 * POST /admin/albums — Création d'un album (@EF22).
 * Body : titre (min 3), description?, theme (parmi la liste fixe).
 * Le créateur est l'administrateur connecté (`req.user`).
 */
export async function create(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const erreurs = validateAlbumInput(body);
  if (erreurs.length > 0) {
    res.status(400).json({ success: false, message: erreurs[0], errors: erreurs });
    return;
  }

  const resultat = await creerAlbum(body, req.user?.id ?? null);
  if (!resultat.ok) {
    res.status(400).json({ success: false, message: resultat.message });
    return;
  }

  res.status(201).json({ success: true, data: resultat.data });
}

/**
 * PUT /admin/albums/:id — Modification d'un album (@EF22).
 * Mêmes validations que la création ; la liste `medias` n'est pas touchée.
 */
export async function update(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant d'album invalide" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const erreurs = validateAlbumInput(body);
  if (erreurs.length > 0) {
    res.status(400).json({ success: false, message: erreurs[0], errors: erreurs });
    return;
  }

  const resultat = await modifierAlbum(id, body);
  if (!resultat.ok) {
    res.status(404).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, data: resultat.data });
}

/**
 * DELETE /admin/albums/:id — Suppression d'un album et de ses fichiers S3 (@EF22).
 */
export async function remove(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant d'album invalide" });
    return;
  }

  const resultat = await supprimerAlbum(id);
  if (!resultat.ok) {
    res.status(404).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, message: "Album supprimé." });
}

/**
 * POST /admin/albums/:id/media — Upload de médias dans un album (@EF22/@EF23).
 * Multipart : champ `files` (20 max, 10 Mo, JPG/PNG/MP4/WEBM — validés par le middleware
 * `uploadMany` monté en inline sur la route). Les fichiers sont uploadés sur MinIO
 * (dossier `galerie`) puis ajoutés à la liste `medias` de l'album.
 */
export async function uploadMedia(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant d'album invalide" });
    return;
  }

  if (!Array.isArray(req.files) || req.files.length === 0) {
    res.status(400).json({ success: false, message: "Aucun fichier reçu (champ 'files')." });
    return;
  }

  const resultat = await ajouterMedias(id, req.files);
  if (!resultat.ok) {
    res.status(404).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, data: resultat.data });
}

/**
 * DELETE /admin/albums/:albumId/media/:mediaId — Suppression d'un média (@EF24).
 * Le fichier S3 est supprimé (best-effort) puis l'entrée est retirée de la liste `medias`.
 */
export async function deleteMedia(req: Request, res: Response): Promise<void> {
  const albumId = parseId(req.params.albumId);
  if (!albumId) {
    res.status(400).json({ success: false, message: "Identifiant d'album invalide" });
    return;
  }

  const mediaId = req.params.mediaId;
  if (typeof mediaId !== "string" || mediaId.trim() === "") {
    res.status(400).json({ success: false, message: "Identifiant de média invalide" });
    return;
  }

  const resultat = await supprimerMedia(albumId, mediaId.trim());
  if (!resultat.ok) {
    res.status(404).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, message: "Média supprimé.", data: resultat.data });
}
