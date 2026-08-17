// Contrôleur Module 5 — Fiches techniques par catégorie — BFA Bille Football Academy
// @EF25 : consultation publique (par catégorie / par id, effectif calculé inclus)
// @EF26 : changement rapide de catégorie (menu/onglets frontend)
// @EF27 : mise à jour du staff · @EF28 : ajout d'une ligne au palmarès.
// Accès DB via le singleton centralisé dans `src/config/database.ts`.
// Express 5 : pas de wrapper async — le contrôleur répond explicitement pour les cas
// attendus (400/404/409) ; les erreurs inattendues remontent au middleware d'erreur de `app.ts`.
// Le service traduit ses codes en statuts : CATEGORIE_INTROUVABLE → 404,
// FICHE_INTROUVABLE → 404, FICHE_EXISTANTE → 409.

import type { Request, Response } from "express";
import {
  validateTeamSheetCreate,
  validateTeamSheetUpdate,
} from "../utils/teamSheetValidator";
import {
  creerFiche,
  listerFiches,
  modifierFiche,
  modifierFichePartielle,
  obtenirFiche,
  obtenirFicheParCategorie,
  supprimerFiche,
} from "../services/teamSheetService";

/**
 * Convertit un paramètre d'URL en entier positif ; renvoie 0 si invalide (<= 0 ou non entier).
 * Les types Express 5 typent `req.params.id` en `string | string[]` (paramètres répétables).
 */
function parseId(value: string | string[]): number {
  const v = Array.isArray(value) ? value[0] : value;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/** Statut HTTP associé au code d'erreur métier du service (défaut : 404). */
function statutPourCode(code?: string): number {
  switch (code) {
    case "FICHE_EXISTANTE":
      return 409;
    case "CATEGORIE_INTROUVABLE":
    case "FICHE_INTROUVABLE":
    default:
      return 404;
  }
}

/**
 * GET /admin/team-sheets — Liste paginée de toutes les fiches (avec catégorie).
 * Query : `page` (défaut 1), `limit` (défaut 10, max 100).
 */
export async function getAll(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? "10"), 10) || 10));

  const resultat = await listerFiches({ page, limit });
  res.json({ success: true, data: resultat.data });
}

/**
 * GET /api/team-sheets/categorie/:categorieId — Fiche d'une catégorie, effectif calculé
 * inclus (@EF25/@EF26). 404 si la catégorie n'existe pas ou n'a pas de fiche.
 */
export async function getByCategorie(req: Request, res: Response): Promise<void> {
  const categorieId = parseId(req.params.categorieId);
  if (!categorieId) {
    res.status(400).json({ success: false, message: "Identifiant de catégorie invalide" });
    return;
  }

  const resultat = await obtenirFicheParCategorie(categorieId);
  if (!resultat.ok) {
    res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, data: resultat.data });
}

/**
 * GET /api/team-sheets/:id — Fiche technique par son id, catégorie + effectif inclus (@EF25).
 */
export async function getById(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant de fiche technique invalide" });
    return;
  }

  const resultat = await obtenirFiche(id);
  if (!resultat.ok) {
    res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, data: resultat.data });
}

/**
 * POST /admin/team-sheets — Création d'une fiche technique (@EF27).
 * Body : categorieId (obligatoire), saison (obligatoire, AAAA-AAAA), staff/palmares/objectifs (optionnels).
 * 409 si une fiche existe déjà pour la catégorie (unicité 1:1).
 */
export async function create(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const erreurs = validateTeamSheetCreate(body);
  if (erreurs.length > 0) {
    res.status(400).json({ success: false, message: erreurs[0], errors: erreurs });
    return;
  }

  const resultat = await creerFiche(body, req.user?.id ?? null);
  if (!resultat.ok) {
    res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message });
    return;
  }

  res.status(201).json({ success: true, data: resultat.data });
}

/**
 * PUT /admin/team-sheets/:id — Remplacement complet (@EF27/@EF28).
 * Mêmes validations que la création (sans categorieId, l'id est dans l'URL).
 */
export async function update(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant de fiche technique invalide" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const erreurs = validateTeamSheetUpdate(body, false);
  if (erreurs.length > 0) {
    res.status(400).json({ success: false, message: erreurs[0], errors: erreurs });
    return;
  }

  const resultat = await modifierFiche(id, body, req.user?.id ?? null);
  if (!resultat.ok) {
    res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, data: resultat.data });
}

/**
 * PATCH /admin/team-sheets/:id — Mise à jour partielle (@EF27/@EF28).
 * Seuls les champs fournis sont modifiés. Pour @EF28, le frontend envoie le texte
 * complet du palmarès (PATCH = remplacement de la valeur).
 */
export async function patch(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant de fiche technique invalide" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const erreurs = validateTeamSheetUpdate(body, true);
  if (erreurs.length > 0) {
    res.status(400).json({ success: false, message: erreurs[0], errors: erreurs });
    return;
  }

  const resultat = await modifierFichePartielle(id, body, req.user?.id ?? null);
  if (!resultat.ok) {
    res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, data: resultat.data });
}

/**
 * DELETE /admin/team-sheets/:id — Suppression d'une fiche technique.
 * Convention du projet : réponse 200 avec message (jamais 204).
 */
export async function remove(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant de fiche technique invalide" });
    return;
  }

  const resultat = await supprimerFiche(id);
  if (!resultat.ok) {
    res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, message: "Fiche technique supprimée." });
}
