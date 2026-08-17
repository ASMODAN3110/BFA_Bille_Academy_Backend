// Contrôleur Module 3 — Demandes d'essai — BFA Bille Football Academy
// @EF15 : création publique · @EF16 : date future · @EF17 : email valide
// @EF18 : confirmation · @EF19 : refus (motif) · @EF20 : liste/détail/suppression.
// Accès DB via le singleton centralisé dans `src/config/database.ts`.
// Express 5 : pas de wrapper async — le contrôleur répond explicitement pour les cas
// attendus (400/404/409) ; les erreurs inattendues remontent au middleware d'erreur de `app.ts`.
// Le service traduit ses codes en statuts : INTROUVABLE → 404, DEJA_TRAITEE → 409.

import type { Request, Response } from "express";
import { validateRefusInput, validateTrialInput } from "../utils/trialValidator";
import {
  creerDemandeEssai,
  listerDemandesEssais,
  obtenirDemandeEssai,
  refuserDemandeEssai,
  supprimerDemandeEssai,
  validerDemandeEssai,
} from "../services/trialService";

/** Valeurs de l'enum Prisma `StatutDemande` (filtre de liste). */
const STATUTS = ["EN_ATTENTE", "CONFIRME", "REFUSE"] as const;
type Statut = (typeof STATUTS)[number];

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
 * POST /api/trials — Création publique d'une demande d'essai (@EF15/@EF16/@EF17).
 * Body : nomJoueur, prenomJoueur, age (9-17), telephone, email, dateEssai (future), message?
 * Règle métier : l'âge doit correspondre à une catégorie existante (vérifiée en service).
 */
export async function create(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const erreurs = validateTrialInput(body);
  if (erreurs.length > 0) {
    res.status(400).json({ success: false, message: erreurs[0], errors: erreurs });
    return;
  }

  const resultat = await creerDemandeEssai(body);
  if (!resultat.ok) {
    res.status(400).json({ success: false, message: resultat.message });
    return;
  }

  res.status(201).json({ success: true, data: resultat.data });
}

/**
 * GET /admin/trials — Liste paginée des demandes avec filtre statut optionnel (@EF20).
 * Query : `page` (défaut 1), `limit` (défaut 10, max 100), `statut` (EN_ATTENTE|CONFIRME|REFUSE).
 * Tri `dateSoumission` décroissante (les plus récentes d'abord).
 */
export async function list(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? "10"), 10) || 10));

  const rawStatut = req.query.statut;
  if (rawStatut !== undefined && !STATUTS.includes(rawStatut as Statut)) {
    res.status(400).json({
      success: false,
      message: "Le filtre statut doit être EN_ATTENTE, CONFIRME ou REFUSE",
    });
    return;
  }
  const statut = rawStatut !== undefined ? (rawStatut as Statut) : undefined;

  const resultat = await listerDemandesEssais({ page, limit, statut });
  res.json({ success: true, data: resultat.data });
}

/**
 * GET /admin/trials/:id — Fiche détaillée d'une demande, administrateur traitant inclus (@EF20).
 */
export async function detail(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant de demande d'essai invalide" });
    return;
  }

  const resultat = await obtenirDemandeEssai(id);
  if (!resultat.ok) {
    res.status(404).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, data: resultat.data });
}

/**
 * PUT /admin/trials/:id/validate — Confirme une demande en attente (@EF18).
 * L'administrateur connecté devient le traitant ; un email de confirmation est envoyé.
 * Une demande déjà confirmée/refusée renvoie 409.
 */
export async function validate(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant de demande d'essai invalide" });
    return;
  }

  const resultat = await validerDemandeEssai(id, req.user?.id ?? null);
  if (!resultat.ok) {
    const status = resultat.code === "INTROUVABLE" ? 404 : 409;
    res.status(status).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, data: resultat.data });
}

/**
 * PUT /admin/trials/:id/refuse — Refuse une demande en attente avec motif (@EF19).
 * Le motif est obligatoire ; un email de refus (avec motif) est envoyé au demandeur.
 * Une demande déjà confirmée/refusée renvoie 409.
 */
export async function refuse(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant de demande d'essai invalide" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const erreurs = validateRefusInput(body);
  if (erreurs.length > 0) {
    res.status(400).json({ success: false, message: erreurs[0], errors: erreurs });
    return;
  }

  const resultat = await refuserDemandeEssai(id, req.user?.id ?? null, (body.motifRefus as string).trim());
  if (!resultat.ok) {
    const status = resultat.code === "INTROUVABLE" ? 404 : 409;
    res.status(status).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, data: resultat.data });
}

/**
 * DELETE /admin/trials/:id — Suppression d'une demande d'essai (@EF20).
 */
export async function remove(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant de demande d'essai invalide" });
    return;
  }

  const resultat = await supprimerDemandeEssai(id);
  if (!resultat.ok) {
    res.status(404).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, message: "Demande d'essai supprimée." });
}
