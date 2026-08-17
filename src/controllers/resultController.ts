// Contrôleur Module 7 — Résultats et classements — BFA Bille Football Academy
// @EF35 : liste publique des résultats (tri date desc), filtre ?categorieId=
// @EF36 : classement public d'une catégorie (tri points desc, position incluse)
// @EF37 : validation stricte (400 si type libellé ou catégorie invalide)
// @EF38 : CRUD admin des résultats (201 à la création, 200 aux écritures suivantes)
// @EF39 : suppression → 200 message (jamais 204)
// @EF40 : recalcul automatique du classement après chaque écriture
// Le service traduit ses codes en statuts : RESULTAT_INTROUVABLE → 404,
// CATEGORIE_INTROUVABLE → 404.

import type { Request, Response } from "express";
import { validateResultCreate, validateResultUpdate } from "../utils/resultValidator";
import { lireClassement } from "../services/rankingService";
import {
  creerResultat,
  listerResultats,
  modifierResultat,
  obtenirResultat,
  supprimerResultat,
} from "../services/resultService";

/**
 * Convertit un paramètre d'URL en entier positif ; renvoie 0 si invalide (<= 0 ou non entier).
 * Les types Express 5 typent `req.params.*` en `string | string[]` (paramètres répétables).
 */
function parseId(value: string | string[]): number {
  const v = Array.isArray(value) ? value[0] : value;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/** Statut HTTP associé au code d'erreur métier du service (défaut : 404). */
function statutPourCode(code?: string): number {
  switch (code) {
    case "RESULTAT_INTROUVABLE":
    case "CATEGORIE_INTROUVABLE":
    default:
      return 404;
  }
}

/** Ramène une valeur de `req.query` à une chaîne simple (ignore les tableaux). */
function queryString(valeur: unknown): string | undefined {
  return typeof valeur === "string" ? valeur : undefined;
}

/**
 * Ramène `?categorieId=` à un entier positif ; 0 si présent mais invalide
 * (400) ; undefined si absent (pas de filtre).
 */
function lireCategorieId(valeur: unknown): number | undefined {
  const s = queryString(valeur);
  if (s === undefined) return undefined;
  const n = Number(s);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function lirePagination(req: Request): { page: number; limit: number } {
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? "10"), 10) || 10));
  return { page, limit };
}

/** GET /api/results — Liste publique des résultats (@EF35), filtre `?categorieId=`. */
export async function getPublic(req: Request, res: Response): Promise<void> {
  const { page, limit } = lirePagination(req);
  const categorieId = lireCategorieId(req.query.categorieId);

  if (categorieId === 0) {
    res.status(400).json({ success: false, message: "Identifiant de catégorie invalide" });
    return;
  }

  const resultat = await listerResultats({ page, limit, categorieId });
  res.json({ success: true, data: resultat.data });
}

/** GET /api/rankings/:categorieId — Classement public d'une catégorie (@EF36). */
export async function getRankings(req: Request, res: Response): Promise<void> {
  const categorieId = parseId(req.params.categorieId);
  if (!categorieId) {
    res.status(400).json({ success: false, message: "Identifiant de catégorie invalide" });
    return;
  }

  const resultat = await lireClassement(categorieId);
  if (!resultat.ok) {
    res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, data: resultat.data });
}

/** GET /admin/results — Liste admin paginée (tous les résultats), filtre `?categorieId=`. */
export async function getAll(req: Request, res: Response): Promise<void> {
  const { page, limit } = lirePagination(req);
  const categorieId = lireCategorieId(req.query.categorieId);

  if (categorieId === 0) {
    res.status(400).json({ success: false, message: "Identifiant de catégorie invalide" });
    return;
  }

  const resultat = await listerResultats({ page, limit, categorieId });
  res.json({ success: true, data: resultat.data });
}

/** GET /admin/results/:id — Détail d'un résultat. */
export async function getById(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant de résultat invalide" });
    return;
  }

  const resultat = await obtenirResultat(id);
  if (!resultat.ok) {
    res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, data: resultat.data });
}

/**
 * POST /admin/results — Création d'un résultat (@EF38) → 201, puis recalcul du
 * classement de la catégorie (@EF40).
 * Body : equipeA, equipeB, scoreA, scoreB, date, type (AMICAL|CHAMPIONNAT), categorieId.
 */
export async function create(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const erreurs = validateResultCreate(body);
  if (erreurs.length > 0) {
    res.status(400).json({ success: false, message: erreurs[0], errors: erreurs });
    return;
  }

  const resultat = await creerResultat(body, req.user?.id ?? null);
  if (!resultat.ok) {
    res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message });
    return;
  }

  res.status(201).json({ success: true, data: resultat.data });
}

/** PUT /admin/results/:id — Remplacement complet (@EF38). Mêmes validations que la création. */
export async function update(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant de résultat invalide" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const erreurs = validateResultUpdate(body);
  if (erreurs.length > 0) {
    res.status(400).json({ success: false, message: erreurs[0], errors: erreurs });
    return;
  }

  const resultat = await modifierResultat(id, body, req.user?.id ?? null);
  if (!resultat.ok) {
    res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, data: resultat.data });
}

/** DELETE /admin/results/:id — Suppression (@EF39). Réponse 200 avec message (jamais 204). */
export async function remove(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant de résultat invalide" });
    return;
  }

  const resultat = await supprimerResultat(id);
  if (!resultat.ok) {
    res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, message: "Résultat supprimé." });
}
