// Service Module 3 — Règles métier des demandes d'essai — BFA Bille Football Academy
// Le service renvoie un résultat `{ ok, data?, message?, code? }` et ne lève JAMAIS
// d'erreur HTTP : le contrôleur traduit `code` en statut (400/404/409).
// Même convention que `eventService.ts`.
//
// Emails best-effort : `envoyer*` est appelé avec `await` mais ne rejette jamais
// (emailService.ts logge en console sans SMTP et avale toute erreur d'envoi).

import prisma from "../config/database";
import type { DemandeEssai, Prisma, StatutDemande } from "../../generated/prisma/client";
import {
  envoyerAccuseReception,
  envoyerConfirmationEssai,
  envoyerRefusEssai,
} from "./emailService";

/** Demande d'essai avec l'administrateur traitant inclus (id, nom, email). */
export type DemandeEssaiAvecTraitePar = DemandeEssai & {
  traitePar: { id: number; nom: string; email: string } | null;
};

/** Liste paginée des demandes (enveloppe convention du projet). */
export interface ListeDemandes {
  items: DemandeEssaiAvecTraitePar[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Résultat d'une opération du service : données facultatives + code d'erreur métier.
 * `code` n'est renseigné que quand `ok` est faux et guide le statut HTTP :
 * - "INTROUVABLE" → 404
 * - "DEJA_TRAITEE" → 409
 * - "CATEGORIE_INTROUVABLE" → 400
 */
export interface ResultatDemande {
  ok: boolean;
  data?: DemandeEssaiAvecTraitePar | ListeDemandes;
  message?: string;
  code?: "INTROUVABLE" | "DEJA_TRAITEE" | "CATEGORIE_INTROUVABLE";
}

/** Include Prisma répété : l'administrateur traitant (sans son mot de passe). */
const TRAITE_PAR_INCLUDE = {
  traitePar: { select: { id: true, nom: true, email: true } },
} as const;

/**
 * Vérifie la règle commune à la confirmation et au refus : la demande existe et est
 * encore en attente. Renvoie le verdict d'échec (404/409), ou `null` si tout est OK.
 */
function verifierStatutEnAttente(demande: DemandeEssai | null): ResultatDemande | null {
  if (!demande) {
    return { ok: false, code: "INTROUVABLE", message: "Demande d'essai introuvable." };
  }
  if (demande.statut !== "EN_ATTENTE") {
    return {
      ok: false,
      code: "DEJA_TRAITEE",
      message: "Seule une demande en attente peut être confirmée ou refusée.",
    };
  }
  return null;
}

/** Catégorie couvrant l'âge du joueur (ageMin ≤ âge ≤ ageMax), ou `null`. */
export async function trouverCategoriePourAge(age: number) {
  return prisma.categorie.findFirst({
    where: { ageMin: { lte: age }, ageMax: { gte: age } },
  });
}

/**
 * Créé une demande d'essai (@EF15/@EF16/@EF17).
 * Règle métier : l'âge doit être couvert par une catégorie existante (les catégories
 * seedées sont U9 9-10, U15 13-15, U17 16-17 — 11-12 ans ne correspond à rien).
 */
export async function creerDemandeEssai(body: Record<string, unknown>): Promise<ResultatDemande> {
  const age = Number(body.age);
  const categorie = await trouverCategoriePourAge(age);
  if (!categorie) {
    return {
      ok: false,
      code: "CATEGORIE_INTROUVABLE",
      message: `L'âge indiqué (${age} ans) ne correspond à aucune catégorie existante.`,
    };
  }

  const demande = await prisma.demandeEssai.create({
    data: {
      nomJoueur: (body.nomJoueur as string).trim(),
      prenomJoueur: (body.prenomJoueur as string).trim(),
      age,
      telephone: (body.telephone as string).trim(),
      email: (body.email as string).trim().toLowerCase(),
      dateEssai: new Date(body.dateEssai as string),
      message:
        body.message !== undefined && body.message !== null ? (body.message as string).trim() : null,
    },
    include: TRAITE_PAR_INCLUDE,
  });

  // Accusé de réception best-effort : un échec d'envoi n'empêche jamais la création.
  await envoyerAccuseReception(demande);

  return { ok: true, data: demande };
}

/**
 * Liste paginée des demandes avec filtre statut optionnel (@EF20).
 * Tri `dateSoumission` décroissante (les plus récentes d'abord).
 */
export async function listerDemandesEssais(params: {
  page: number;
  limit: number;
  statut?: StatutDemande;
}): Promise<ResultatDemande> {
  const { page, limit, statut } = params;

  const where: Prisma.DemandeEssaiWhereInput = statut ? { statut } : {};

  const [items, total] = await Promise.all([
    prisma.demandeEssai.findMany({
      where,
      orderBy: { dateSoumission: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: TRAITE_PAR_INCLUDE,
    }),
    prisma.demandeEssai.count({ where }),
  ]);

  return {
    ok: true,
    data: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

/** Fiche détaillée d'une demande d'essai (@EF20). */
export async function obtenirDemandeEssai(id: number): Promise<ResultatDemande> {
  const demande = await prisma.demandeEssai.findUnique({
    where: { id },
    include: TRAITE_PAR_INCLUDE,
  });
  if (!demande) {
    return { ok: false, code: "INTROUVABLE", message: "Demande d'essai introuvable." };
  }
  return { ok: true, data: demande };
}

/**
 * Confirme une demande en attente : statut CONFIRME + administrateur traitant (@EF18).
 * Un email de confirmation est envoyé au demandeur (best-effort).
 */
export async function validerDemandeEssai(
  id: number,
  administrateurId: number | null
): Promise<ResultatDemande> {
  const existante = await prisma.demandeEssai.findUnique({ where: { id } });
  const attente = verifierStatutEnAttente(existante);
  if (attente) return attente;

  const demande = await prisma.demandeEssai.update({
    where: { id },
    data: { statut: "CONFIRME", administrateurId },
    include: TRAITE_PAR_INCLUDE,
  });

  await envoyerConfirmationEssai(demande);

  return { ok: true, data: demande };
}

/**
 * Refuse une demande en attente : statut REFUSE + motif + administrateur traitant (@EF19).
 * Un email de refus (avec motif) est envoyé au demandeur (best-effort).
 */
export async function refuserDemandeEssai(
  id: number,
  administrateurId: number | null,
  motifRefus: string
): Promise<ResultatDemande> {
  const existante = await prisma.demandeEssai.findUnique({ where: { id } });
  const attente = verifierStatutEnAttente(existante);
  if (attente) return attente;

  const demande = await prisma.demandeEssai.update({
    where: { id },
    data: { statut: "REFUSE", motifRefus, administrateurId },
    include: TRAITE_PAR_INCLUDE,
  });

  await envoyerRefusEssai(demande);

  return { ok: true, data: demande };
}

/** Supprime une demande d'essai (@EF20). */
export async function supprimerDemandeEssai(id: number): Promise<ResultatDemande> {
  const existante = await prisma.demandeEssai.findUnique({ where: { id }, select: { id: true } });
  if (!existante) {
    return { ok: false, code: "INTROUVABLE", message: "Demande d'essai introuvable." };
  }
  await prisma.demandeEssai.delete({ where: { id } });
  return { ok: true };
}
