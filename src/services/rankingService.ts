// Service Module 7 — Classements — BFA Bille Football Academy
// Le classement n'est PAS saisi à la main : il est recalculé à partir des
// résultats d'une catégorie (règle 3 points / victoire, 1 / nul, 0 / défaite).
// `recalculerClassement` persiste le résultat en base (table `Classement`) pour
// que l'API de lecture reste une simple requête triée (@EF36).
// Convention service : renvoie `{ ok, data?, message?, code? }`, ne lève jamais
// d'erreur HTTP (le contrôleur traduit `code` en statut).

import prisma from "../config/database";
import type { Prisma } from "../../generated/prisma/client";

/** Une ligne du classement renvoyée par l'API (position = rang, index + 1). */
export interface LigneClassement {
  position: number;
  equipe: string;
  matchsJoues: number;
  victoires: number;
  nuls: number;
  defaites: number;
  points: number;
}

/** Accumulateur interne (avant tri et numérotation des positions). */
interface StatsEquipe {
  equipe: string;
  matchsJoues: number;
  victoires: number;
  nuls: number;
  defaites: number;
  points: number;
}

/**
 * Calcul en mémoire du classement d'une catégorie à partir de ses résultats.
 * Tri : points desc, puis victoires desc ; `position` = index + 1 (@EF36).
 */
export async function calculerClassement(categorieId: number): Promise<LigneClassement[]> {
  const resultats = await prisma.resultat.findMany({ where: { categorieId } });

  const stats = new Map<string, StatsEquipe>();
  const initialiser = (equipe: string): StatsEquipe => {
    let s = stats.get(equipe);
    if (!s) {
      s = { equipe, matchsJoues: 0, victoires: 0, nuls: 0, defaites: 0, points: 0 };
      stats.set(equipe, s);
    }
    return s;
  };

  for (const r of resultats) {
    const a = initialiser(r.equipeA);
    const b = initialiser(r.equipeB);
    a.matchsJoues += 1;
    b.matchsJoues += 1;
    if (r.scoreA > r.scoreB) {
      a.victoires += 1;
      a.points += 3;
      b.defaites += 1;
    } else if (r.scoreA < r.scoreB) {
      b.victoires += 1;
      b.points += 3;
      a.defaites += 1;
    } else {
      a.nuls += 1;
      a.points += 1;
      b.nuls += 1;
      b.points += 1;
    }
  }

  return [...stats.values()]
    .filter((s) => s.matchsJoues > 0)
    .sort((x, y) => y.points - x.points || y.victoires - x.victoires)
    .map((s, index) => ({ ...s, position: index + 1 }));
}

/**
 * Recalcule PUIS persiste le classement d'une catégorie (table `Classement`).
 * Appelé après chaque écriture de résultat (création, modification, suppression).
 * La suppression préalable rend l'opération idempotente (aucun doublon sur
 * `@@unique([categorieId, equipe])`).
 */
export async function recalculerClassement(categorieId: number): Promise<LigneClassement[]> {
  const lignes = await calculerClassement(categorieId);

  const operations: Prisma.PrismaPromise<Prisma.BatchPayload>[] = [
    prisma.classement.deleteMany({ where: { categorieId } }),
  ];
  if (lignes.length > 0) {
    operations.push(
      prisma.classement.createMany({
        data: lignes.map((l) => ({
          equipe: l.equipe,
          matchsJoues: l.matchsJoues,
          victoires: l.victoires,
          nuls: l.nuls,
          defaites: l.defaites,
          points: l.points,
          categorieId,
        })),
      }),
    );
  }
  await prisma.$transaction(operations);

  return lignes;
}

/** Réponse de `lireClassement` (la `position` est calculée, jamais stockée). */
export interface ResultatClassement {
  ok: boolean;
  data?: { categorie: { id: number; nom: string }; items: LigneClassement[] };
  message?: string;
  code?: "CATEGORIE_INTROUVABLE";
}

/**
 * Lecture du classement persisté d'une catégorie (@EF36).
 * Tri identique au calcul (points desc, puis victoires desc) ; `position` calculée.
 */
export async function lireClassement(categorieId: number): Promise<ResultatClassement> {
  const categorie = await prisma.categorie.findUnique({
    where: { id: categorieId },
    select: { id: true, nom: true },
  });
  if (!categorie) {
    return { ok: false, code: "CATEGORIE_INTROUVABLE", message: "Catégorie introuvable." };
  }

  const lignes = await prisma.classement.findMany({
    where: { categorieId },
    orderBy: [{ points: "desc" }, { victoires: "desc" }],
  });

  const items: LigneClassement[] = lignes.map((l, index) => ({
    position: index + 1,
    equipe: l.equipe,
    matchsJoues: l.matchsJoues,
    victoires: l.victoires,
    nuls: l.nuls,
    defaites: l.defaites,
    points: l.points,
  }));

  return { ok: true, data: { categorie, items } };
}
