// Service Module 7 — Résultats de matchs — BFA Bille Football Academy
// CRUD des résultats + recalcul automatique du classement de la (des) catégorie(s)
// concernée(s) après chaque écriture (règle : le classement découle des résultats).
// Convention service : renvoie `{ ok, data?, message?, code? }`, ne lève jamais
// d'erreur HTTP (le contrôleur traduit `code` en statut).

import prisma from "../config/database";
import type { Prisma, TypeMatch } from "../../generated/prisma/client";
import { recalculerClassement } from "./rankingService";

/** Relation incluse sur chaque résultat : sa catégorie (id + nom). */
const includeCategorie = {
  categorie: { select: { id: true, nom: true } },
} satisfies Prisma.ResultatInclude;

/** Résultat tel que renvoyé par l'API (avec sa catégorie). */
export type ResultatAvecCategorie = Prisma.ResultatGetPayload<{
  include: typeof includeCategorie;
}>;

/** Code d'erreur métier (→ statut HTTP dans le contrôleur). */
type CodeErreur = "RESULTAT_INTROUVABLE" | "CATEGORIE_INTROUVABLE";

/** Page de résultats (liste paginée). */
export interface ListeResultats {
  items: ResultatAvecCategorie[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Réponse commune des opérations du service. */
export interface ResultatOperation {
  ok: boolean;
  data?: ResultatAvecCategorie | ListeResultats;
  message?: string;
  code?: CodeErreur;
}

/** GET — Liste paginée des résultats (tri date desc), filtre optionnel par catégorie. */
export async function listerResultats(params: {
  page: number;
  limit: number;
  categorieId?: number;
}): Promise<ResultatOperation> {
  const { page, limit, categorieId } = params;

  const where: Prisma.ResultatWhereInput = {};
  if (categorieId !== undefined) {
    where.categorieId = categorieId;
  }

  const [items, total] = await Promise.all([
    prisma.resultat.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: includeCategorie,
    }),
    prisma.resultat.count({ where }),
  ]);

  return {
    ok: true,
    data: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

/** GET /:id — Détail d'un résultat. */
export async function obtenirResultat(id: number): Promise<ResultatOperation> {
  const resultat = await prisma.resultat.findUnique({
    where: { id },
    include: includeCategorie,
  });
  if (!resultat) {
    return { ok: false, code: "RESULTAT_INTROUVABLE", message: "Résultat introuvable." };
  }
  return { ok: true, data: resultat };
}

/** Payload Prisma d'un résultat (body déjà validé par `resultValidator`). */
function payloadResultat(
  body: Record<string, unknown>,
  categorieId: number,
  adminId: number | null,
): {
  equipeA: string;
  equipeB: string;
  scoreA: number;
  scoreB: number;
  date: Date;
  type: TypeMatch;
  categorieId: number;
  administrateurId: number | null;
} {
  return {
    equipeA: String(body.equipeA).trim(),
    equipeB: String(body.equipeB).trim(),
    scoreA: Number(body.scoreA),
    scoreB: Number(body.scoreB),
    date: new Date(String(body.date)),
    type: String(body.type) as TypeMatch,
    categorieId,
    administrateurId: adminId,
  };
}

/** POST — Création d'un résultat (@EF38) puis recalcul du classement de sa catégorie. */
export async function creerResultat(
  body: Record<string, unknown>,
  adminId: number | null,
): Promise<ResultatOperation> {
  const categorieId = Number(body.categorieId);

  const categorie = await prisma.categorie.findUnique({
    where: { id: categorieId },
    select: { id: true },
  });
  if (!categorie) {
    return { ok: false, code: "CATEGORIE_INTROUVABLE", message: "Catégorie introuvable." };
  }

  const resultat = await prisma.resultat.create({
    data: payloadResultat(body, categorieId, adminId),
    include: includeCategorie,
  });

  await recalculerClassement(categorieId);
  return { ok: true, data: resultat };
}

/**
 * PUT /:id — Remplacement complet d'un résultat (@EF38).
 * Si la catégorie change, le classement des DEUX catégories (ancienne et nouvelle)
 * est recalculé : les points sont retirés de l'ancienne et ajoutés à la nouvelle.
 */
export async function modifierResultat(
  id: number,
  body: Record<string, unknown>,
  adminId: number | null,
): Promise<ResultatOperation> {
  const existant = await prisma.resultat.findUnique({
    where: { id },
    select: { id: true, categorieId: true },
  });
  if (!existant) {
    return { ok: false, code: "RESULTAT_INTROUVABLE", message: "Résultat introuvable." };
  }

  const nouveauCategorieId = Number(body.categorieId);
  const categorie = await prisma.categorie.findUnique({
    where: { id: nouveauCategorieId },
    select: { id: true },
  });
  if (!categorie) {
    return { ok: false, code: "CATEGORIE_INTROUVABLE", message: "Catégorie introuvable." };
  }

  const resultat = await prisma.resultat.update({
    where: { id },
    data: payloadResultat(body, nouveauCategorieId, adminId),
    include: includeCategorie,
  });

  if (existant.categorieId !== null && existant.categorieId !== nouveauCategorieId) {
    await recalculerClassement(existant.categorieId);
  }
  await recalculerClassement(nouveauCategorieId);

  return { ok: true, data: resultat };
}

/** DELETE /:id — Suppression d'un résultat (@EF39) puis recalcul de sa catégorie. */
export async function supprimerResultat(id: number): Promise<ResultatOperation> {
  const existant = await prisma.resultat.findUnique({
    where: { id },
    select: { id: true, categorieId: true },
  });
  if (!existant) {
    return { ok: false, code: "RESULTAT_INTROUVABLE", message: "Résultat introuvable." };
  }

  await prisma.resultat.delete({ where: { id } });

  if (existant.categorieId !== null) {
    await recalculerClassement(existant.categorieId);
  }
  return { ok: true };
}
