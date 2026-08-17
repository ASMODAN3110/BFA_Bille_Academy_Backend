// Service Module 6 — Blog d'actualités — BFA Bille Football Academy
// Le service renvoie `{ ok, data?, message?, code? }` et ne lève JAMAIS d'erreur
// HTTP : le contrôleur traduit `code` en statut (ARTICLE_INTROUVABLE → 404).
// Même convention que `teamSheetService.ts` / `albumService.ts`.
//
// Décisions d'architecture :
// - `image` est une URL publique S3 DÉJÀ stockée (le frontend passe par
//   `/admin/media/upload`, dossier `blog`) : ce module ne fait aucun upload.
// - `extrait` est CALCULÉ à la lecture depuis `contenu` (le modèle `Article`
//   n'a pas de colonne d'extrait). La liste renvoie les articles complets
//   (dont `contenu`) + `extrait`.
// - Pas de `dateModification` / `vues` / `commentaires` : dérivés côté frontend.
// - `administrateurId` est NULLABLE (`ecritPar`, onDelete: SetNull) : on passe
//   `req.user?.id ?? null`.

import prisma from "../config/database";
import type { Article, CategorieArticle, Prisma } from "../../generated/prisma/client";

/** Article de liste/détail enrichi de l'extrait calculé. */
export type ArticleDetail = Article & { extrait: string };

export interface ListeArticles {
  items: ArticleDetail[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Résultat d'une opération du service : `ARTICLE_INTROUVABLE` → 404. */
export interface ResultatArticle {
  ok: boolean;
  data?: ArticleDetail | ListeArticles;
  message?: string;
  code?: "ARTICLE_INTROUVABLE";
}

/** Extrait lisible (sans HTML) du contenu, tronqué à ~150 caractères. */
function extraireExtrait(contenu: string): string {
  const texte = String(contenu)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return texte.length > 150 ? `${texte.slice(0, 150)}…` : texte;
}

function enrichir(article: Article): ArticleDetail {
  return { ...article, extrait: extraireExtrait(article.contenu) };
}

/** Date valide depuis le body, ou `null` si absente/invalide. */
function lireDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Construit le `where` des filtres admin (categorie / estPublie / recherche). */
function construireWhereAdmin(params: {
  categorie?: string;
  estPublie?: boolean;
  recherche?: string;
}): Prisma.ArticleWhereInput {
  const where: Prisma.ArticleWhereInput = {};
  if (params.categorie) where.categorie = params.categorie as CategorieArticle;
  if (params.estPublie !== undefined) where.estPublie = params.estPublie;
  if (params.recherche) {
    const q = params.recherche;
    where.OR = [
      { titre: { contains: q, mode: "insensitive" } },
      { auteur: { contains: q, mode: "insensitive" } },
    ];
  }
  return where;
}

/**
 * Liste admin paginée (publiés + brouillons) — @EF34.
 * Filtres optionnels : `categorie`, `estPublie`, `recherche` (titre OU auteur).
 * Tri `datePublication` desc (@EF29).
 */
export async function listerArticles(params: {
  page: number;
  limit: number;
  categorie?: string;
  estPublie?: boolean;
  recherche?: string;
}): Promise<ResultatArticle> {
  const { page, limit } = params;
  const where = construireWhereAdmin(params);

  const [items, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { datePublication: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.article.count({ where }),
  ]);

  return {
    ok: true,
    data: {
      items: items.map(enrichir),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Liste publique paginée : SEULS les articles publiés (@EF29), filtre optionnel
 * par catégorie (@EF30). Tri `datePublication` desc.
 */
export async function listerArticlesPublics(params: {
  page: number;
  limit: number;
  categorie?: string;
}): Promise<ResultatArticle> {
  const { page, limit } = params;
  const where: Prisma.ArticleWhereInput = { estPublie: true };
  if (params.categorie) where.categorie = params.categorie as CategorieArticle;

  const [items, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { datePublication: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.article.count({ where }),
  ]);

  return {
    ok: true,
    data: {
      items: items.map(enrichir),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/** Détail admin d'un article, quel que soit son statut (@EF34). */
export async function obtenirArticle(id: number): Promise<ResultatArticle> {
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) {
    return { ok: false, code: "ARTICLE_INTROUVABLE", message: "Article introuvable." };
  }
  return { ok: true, data: enrichir(article) };
}

/**
 * Détail PUBLIC d'un article : accessible uniquement s'il est publié (@EF31).
 * 404 sinon (même message pour article inexistant ou non publié).
 */
export async function obtenirArticlePublic(id: number): Promise<ResultatArticle> {
  const article = await prisma.article.findFirst({
    where: { id, estPublie: true },
  });
  if (!article) {
    return {
      ok: false,
      code: "ARTICLE_INTROUVABLE",
      message: "Article introuvable ou non publié.",
    };
  }
  return { ok: true, data: enrichir(article) };
}

/** Crée un article (@EF32). `estPublie` par défaut à `false` (schéma réel). */
export async function creerArticle(
  body: Record<string, unknown>,
  adminId: number | null,
): Promise<ResultatArticle> {
  const datePublication = lireDate(body.datePublication) ?? new Date();

  const article = await prisma.article.create({
    data: {
      titre: (body.titre as string).trim(),
      contenu: (body.contenu as string).trim(),
      categorie: (body.categorie as string).trim() as CategorieArticle,
      auteur: (body.auteur as string).trim(),
      image:
        typeof body.image === "string" && body.image.trim() !== ""
          ? body.image.trim()
          : null,
      estPublie: body.estPublie === true,
      datePublication,
      administrateurId: adminId,
    },
  });

  return { ok: true, data: enrichir(article) };
}

/**
 * Remplacement complet (PUT @EF34). `datePublication` n'est PAS réécrite à `now()`
 * si elle n'est pas fournie (sinon chaque édition reclasserait l'article en tête).
 */
export async function modifierArticle(
  id: number,
  body: Record<string, unknown>,
  adminId: number | null,
): Promise<ResultatArticle> {
  const existant = await prisma.article.findUnique({ where: { id }, select: { id: true } });
  if (!existant) {
    return { ok: false, code: "ARTICLE_INTROUVABLE", message: "Article introuvable." };
  }

  const article = await prisma.article.update({
    where: { id },
    data: {
      titre: (body.titre as string).trim(),
      contenu: (body.contenu as string).trim(),
      categorie: (body.categorie as string).trim() as CategorieArticle,
      auteur: (body.auteur as string).trim(),
      image:
        typeof body.image === "string" && body.image.trim() !== ""
          ? body.image.trim()
          : null,
      estPublie: body.estPublie === true,
      ...(body.datePublication !== undefined
        ? { datePublication: lireDate(body.datePublication) ?? new Date() }
        : {}),
      administrateurId: adminId,
    },
  });

  return { ok: true, data: enrichir(article) };
}

/**
 * Mise à jour partielle (PATCH @EF34). Permet notamment la publication /
 * dépublication via `{ estPublie: boolean }`.
 */
export async function modifierArticlePartielle(
  id: number,
  body: Record<string, unknown>,
  adminId: number | null,
): Promise<ResultatArticle> {
  const existant = await prisma.article.findUnique({ where: { id }, select: { id: true } });
  if (!existant) {
    return { ok: false, code: "ARTICLE_INTROUVABLE", message: "Article introuvable." };
  }

  // Variante Unchecked : assigne la clé étrangère (`administrateurId`) directement.
  const data: Prisma.ArticleUncheckedUpdateInput = { administrateurId: adminId };
  if (body.titre !== undefined) data.titre = (body.titre as string).trim();
  if (body.contenu !== undefined) data.contenu = (body.contenu as string).trim();
  if (body.categorie !== undefined) {
    data.categorie = (body.categorie as string).trim() as CategorieArticle;
  }
  if (body.auteur !== undefined) data.auteur = (body.auteur as string).trim();
  if (body.image !== undefined) {
    data.image =
      typeof body.image === "string" && body.image.trim() !== "" ? body.image.trim() : null;
  }
  if (body.estPublie !== undefined) data.estPublie = body.estPublie === true;
  if (body.datePublication !== undefined) {
    data.datePublication = lireDate(body.datePublication) ?? new Date();
  }

  const article = await prisma.article.update({ where: { id }, data });
  return { ok: true, data: enrichir(article) };
}

/** Supprime un article (DELETE @EF34). */
export async function supprimerArticle(id: number): Promise<ResultatArticle> {
  const existant = await prisma.article.findUnique({ where: { id }, select: { id: true } });
  if (!existant) {
    return { ok: false, code: "ARTICLE_INTROUVABLE", message: "Article introuvable." };
  }

  await prisma.article.delete({ where: { id } });
  return { ok: true };
}
