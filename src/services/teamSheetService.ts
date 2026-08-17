// Service Module 5 — Fiches techniques par catégorie — BFA Bille Football Academy
// Le service renvoie un résultat `{ ok, data?, message?, code? }` et ne lève JAMAIS
// d'erreur HTTP : le contrôleur traduit `code` en statut (404/409).
// Même convention que `albumService.ts` / `eventService.ts` / `trialService.ts`.
//
// Décision d'architecture : l'effectif N'EST PAS un champ de la table
// `FicheTechnique` — il est calculé à la lecture depuis la table `Joueur`
// (relation existante `Categorie.joueurs`, données seedées). Aucune migration,
// aucune duplication de données (@EF25).

import prisma from "../config/database";
import type { FicheTechnique, Prisma } from "../../generated/prisma/client";

/** Entrée de l'effectif calculé : un joueur de la catégorie (@EF25). */
export type JoueurEffectif = {
  nom: string;
  prenom: string;
  poste: string;
};

/** Fiche technique enrichie : catégorie + effectif calculé (GET public/admin). */
export type FicheDetail = FicheTechnique & {
  categorie: { id: number; nom: string; ageMin: number; ageMax: number };
  effectif: JoueurEffectif[];
};

/** Liste paginée des fiches (enveloppe convention du projet). */
export interface ListeFiches {
  items: (FicheTechnique & { categorie: { id: number; nom: string } })[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Résultat d'une opération du service : données facultatives + code d'erreur métier.
 * `code` n'est renseigné que quand `ok` est faux et guide le statut HTTP :
 * - "CATEGORIE_INTROUVABLE" → 404
 * - "FICHE_INTROUVABLE" → 404
 * - "FICHE_EXISTANTE" → 409
 */
export interface ResultatFiche {
  ok: boolean;
  data?: FicheTechnique | FicheDetail | ListeFiches;
  message?: string;
  code?: "CATEGORIE_INTROUVABLE" | "FICHE_INTROUVABLE" | "FICHE_EXISTANTE";
}

/** Normalise un champ texte : trim, `""` si absent / non chaîne. */
function texteNormalise(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Effectif calculé d'une catégorie : ses joueurs, triés par nom (@EF25). */
async function lireEffectif(categorieId: number): Promise<JoueurEffectif[]> {
  const joueurs = await prisma.joueur.findMany({
    where: { categorieId },
    select: { nom: true, prenom: true, poste: true },
    orderBy: { nom: "asc" },
  });
  return joueurs;
}

/** Catégorie embarquée dans la réponse (id, nom, tranche d'âge). */
const selectionCategorie = {
  select: { id: true, nom: true, ageMin: true, ageMax: true },
} as const;

/**
 * Liste paginée de toutes les fiches techniques, avec la catégorie associée.
 * Tri `categorieId` croissant (ordre des catégories du seed).
 */
export async function listerFiches(params: {
  page: number;
  limit: number;
}): Promise<ResultatFiche> {
  const { page, limit } = params;

  const [items, total] = await Promise.all([
    prisma.ficheTechnique.findMany({
      include: { categorie: { select: { id: true, nom: true } } },
      orderBy: { categorieId: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.ficheTechnique.count(),
  ]);

  return {
    ok: true,
    data: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Fiche technique d'une catégorie donnée, effectif calculé inclus (@EF25/@EF26).
 * Catégorie inexistante → `CATEGORIE_INTROUVABLE` ; fiche absente → `FICHE_INTROUVABLE`.
 */
export async function obtenirFicheParCategorie(categorieId: number): Promise<ResultatFiche> {
  const categorie = await prisma.categorie.findUnique({
    where: { id: categorieId },
    select: selectionCategorie.select,
  });
  if (!categorie) {
    return { ok: false, code: "CATEGORIE_INTROUVABLE", message: "Catégorie introuvable." };
  }

  const fiche = await prisma.ficheTechnique.findUnique({ where: { categorieId } });
  if (!fiche) {
    return {
      ok: false,
      code: "FICHE_INTROUVABLE",
      message: "Fiche technique non disponible pour cette catégorie.",
    };
  }

  const effectif = await lireEffectif(categorieId);
  return { ok: true, data: { ...fiche, categorie, effectif } };
}

/** Fiche technique par son id, catégorie + effectif inclus (@EF25). */
export async function obtenirFiche(id: number): Promise<ResultatFiche> {
  const fiche = await prisma.ficheTechnique.findUnique({
    where: { id },
    include: { categorie: selectionCategorie },
  });
  if (!fiche) {
    return { ok: false, code: "FICHE_INTROUVABLE", message: "Fiche technique introuvable." };
  }

  const effectif = await lireEffectif(fiche.categorieId);
  const { categorie, ...reste } = fiche;
  return { ok: true, data: { ...reste, categorie, effectif } };
}

/**
 * Crée la fiche technique d'une catégorie (@EF27) : catégorie existante, unicité
 * 1:1 vérifiée (`FICHE_EXISTANTE` → 409). Les textes vides sont normalisés à `""`.
 */
export async function creerFiche(
  body: Record<string, unknown>,
  modifieParId: number | null
): Promise<ResultatFiche> {
  const categorieId = body.categorieId as number;

  const categorie = await prisma.categorie.findUnique({ where: { id: categorieId }, select: { id: true } });
  if (!categorie) {
    return { ok: false, code: "CATEGORIE_INTROUVABLE", message: "Catégorie introuvable." };
  }

  const existante = await prisma.ficheTechnique.findUnique({ where: { categorieId }, select: { id: true } });
  if (existante) {
    return {
      ok: false,
      code: "FICHE_EXISTANTE",
      message: "Une fiche technique existe déjà pour cette catégorie.",
    };
  }

  const fiche = await prisma.ficheTechnique.create({
    data: {
      staff: texteNormalise(body.staff),
      palmares: texteNormalise(body.palmares),
      objectifs: texteNormalise(body.objectifs),
      saison: (body.saison as string).trim(),
      categorieId,
      modifieParId,
    },
  });

  return { ok: true, data: fiche };
}

/**
 * Remplacement complet (PUT @EF27/@EF28) : `staff`, `palmares`, `objectifs`,
 * `saison` (les champs absents deviennent `""`). `modifieParId` est renseigné.
 */
export async function modifierFiche(
  id: number,
  body: Record<string, unknown>,
  modifieParId: number | null
): Promise<ResultatFiche> {
  const existante = await prisma.ficheTechnique.findUnique({ where: { id }, select: { id: true } });
  if (!existante) {
    return { ok: false, code: "FICHE_INTROUVABLE", message: "Fiche technique introuvable." };
  }

  const fiche = await prisma.ficheTechnique.update({
    where: { id },
    data: {
      staff: texteNormalise(body.staff),
      palmares: texteNormalise(body.palmares),
      objectifs: texteNormalise(body.objectifs),
      saison: (body.saison as string).trim(),
      modifieParId,
    },
  });

  return { ok: true, data: fiche };
}

/**
 * Mise à jour partielle (PATCH @EF27/@EF28) : seules les clés présentes dans le
 * body sont modifiées (plus `modifieParId`). Pour @EF28, le frontend envoie le
 * texte complet du palmarès — le PATCH remplace la valeur, il ne concatène pas.
 */
export async function modifierFichePartielle(
  id: number,
  body: Record<string, unknown>,
  modifieParId: number | null
): Promise<ResultatFiche> {
  const existante = await prisma.ficheTechnique.findUnique({ where: { id }, select: { id: true } });
  if (!existante) {
    return { ok: false, code: "FICHE_INTROUVABLE", message: "Fiche technique introuvable." };
  }

  // Variante Unchecked : assigne les clés étrangères (`modifieParId`) directement.
  const data: Prisma.FicheTechniqueUncheckedUpdateInput = { modifieParId };
  if (body.staff !== undefined) data.staff = texteNormalise(body.staff);
  if (body.palmares !== undefined) data.palmares = texteNormalise(body.palmares);
  if (body.objectifs !== undefined) data.objectifs = texteNormalise(body.objectifs);
  if (body.saison !== undefined) data.saison = (body.saison as string).trim();

  const fiche = await prisma.ficheTechnique.update({ where: { id }, data });

  return { ok: true, data: fiche };
}

/** Supprime une fiche technique (DELETE). */
export async function supprimerFiche(id: number): Promise<ResultatFiche> {
  const existante = await prisma.ficheTechnique.findUnique({ where: { id }, select: { id: true } });
  if (!existante) {
    return { ok: false, code: "FICHE_INTROUVABLE", message: "Fiche technique introuvable." };
  }

  await prisma.ficheTechnique.delete({ where: { id } });

  return { ok: true };
}
