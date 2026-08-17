// Contrôleur Module 6 — Blog d'actualités — BFA Bille Football Academy
// @EF29 : liste publique des articles publiés (tri datePublication desc)
// @EF30 : filtre par catégorie (publique + admin)
// @EF31 : détail public d'un article publié
// @EF32 : création d'un article (201)
// @EF33 : refus 400 si titre vide / contenu trop court
// @EF34 : CRUD admin complet (recherche, filtres, publication, suppression)
// Le service traduit ses codes en statuts : ARTICLE_INTROUVABLE → 404.

import type { Request, Response } from "express";
import {
  CATEGORIES_ARTICLE,
  validateBlogCreate,
  validateBlogPatch,
  validateBlogUpdate,
} from "../utils/blogValidator";
import {
  creerArticle,
  listerArticles,
  listerArticlesPublics,
  modifierArticle,
  modifierArticlePartielle,
  obtenirArticle,
  obtenirArticlePublic,
  supprimerArticle,
} from "../services/blogService";

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
    case "ARTICLE_INTROUVABLE":
    default:
      return 404;
  }
}

/** Ramène une valeur de `req.query` à une chaîne simple (ignore les tableaux). */
function queryString(valeur: unknown): string | undefined {
  return typeof valeur === "string" ? valeur : undefined;
}

/** Vrai si la valeur est l'une des catégories de l'enum (valeur exacte, trim). */
function estCategorieValide(valeur: unknown): valeur is string {
  return (
    typeof valeur === "string" &&
    (CATEGORIES_ARTICLE as readonly string[]).includes(valeur.trim())
  );
}

function lirePagination(req: Request): { page: number; limit: number } {
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? "10"), 10) || 10));
  return { page, limit };
}

/**
 * GET /api/blog — Liste publique des articles publiés (@EF29), filtre optionnel
 * `?categorie=MATCHS` (@EF30), pagination `?page&limit`.
 */
export async function getPublic(req: Request, res: Response): Promise<void> {
  const { page, limit } = lirePagination(req);
  const categorie = queryString(req.query.categorie);

  if (categorie !== undefined && !estCategorieValide(categorie)) {
    res.status(400).json({
      success: false,
      message: `La catégorie doit être l'une des suivantes : ${CATEGORIES_ARTICLE.join(", ")}.`,
    });
    return;
  }

  const resultat = await listerArticlesPublics({
    page,
    limit,
    categorie: categorie?.trim(),
  });
  res.json({ success: true, data: resultat.data });
}

/**
 * GET /api/blog/:id — Détail public d'un article publié (@EF31).
 * 404 « Article introuvable ou non publié. » si absent ou brouillon.
 */
export async function getPublicById(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant d'article invalide" });
    return;
  }

  const resultat = await obtenirArticlePublic(id);
  if (!resultat.ok) {
    res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, data: resultat.data });
}

/**
 * GET /admin/blog — Liste admin paginée (publiés + brouillons) (@EF34).
 * Filtres optionnels : `?categorie=`, `?estPublie=true|false`, `?recherche=` (titre ou auteur).
 */
export async function getAll(req: Request, res: Response): Promise<void> {
  const { page, limit } = lirePagination(req);
  const categorie = queryString(req.query.categorie);
  const estPublieQ = queryString(req.query.estPublie);
  const recherche = queryString(req.query.recherche);

  if (categorie !== undefined && !estCategorieValide(categorie)) {
    res.status(400).json({
      success: false,
      message: `La catégorie doit être l'une des suivantes : ${CATEGORIES_ARTICLE.join(", ")}.`,
    });
    return;
  }

  const resultat = await listerArticles({
    page,
    limit,
    categorie: categorie?.trim(),
    estPublie:
      estPublieQ === "true" ? true : estPublieQ === "false" ? false : undefined,
    recherche: recherche?.trim() !== "" ? recherche?.trim() : undefined,
  });
  res.json({ success: true, data: resultat.data });
}

/** GET /admin/blog/:id — Détail admin d'un article, quel que soit son statut. */
export async function getById(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant d'article invalide" });
    return;
  }

  const resultat = await obtenirArticle(id);
  if (!resultat.ok) {
    res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, data: resultat.data });
}

/**
 * POST /admin/blog — Création d'un article (@EF32) → 201.
 * Body : titre, contenu (HTML), categorie (enum), auteur, image (URL S3 optionnelle),
 * estPublie (booléen optionnel, défaut false), datePublication (optionnelle).
 */
export async function create(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const erreurs = validateBlogCreate(body);
  if (erreurs.length > 0) {
    res.status(400).json({ success: false, message: erreurs[0], errors: erreurs });
    return;
  }

  const resultat = await creerArticle(body, req.user?.id ?? null);
  if (!resultat.ok) {
    res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message });
    return;
  }

  res.status(201).json({ success: true, data: resultat.data });
}

/** PUT /admin/blog/:id — Remplacement complet (@EF34). Mêmes validations que la création. */
export async function update(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant d'article invalide" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const erreurs = validateBlogUpdate(body);
  if (erreurs.length > 0) {
    res.status(400).json({ success: false, message: erreurs[0], errors: erreurs });
    return;
  }

  const resultat = await modifierArticle(id, body, req.user?.id ?? null);
  if (!resultat.ok) {
    res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, data: resultat.data });
}

/**
 * PATCH /admin/blog/:id — Mise à jour partielle (@EF34).
 * Seuls les champs fournis sont modifiés ; `{ estPublie }` permet la
 * publication / dépublication (toggle du back-office).
 */
export async function patch(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant d'article invalide" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const erreurs = validateBlogPatch(body);
  if (erreurs.length > 0) {
    res.status(400).json({ success: false, message: erreurs[0], errors: erreurs });
    return;
  }

  const resultat = await modifierArticlePartielle(id, body, req.user?.id ?? null);
  if (!resultat.ok) {
    res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, data: resultat.data });
}

/** DELETE /admin/blog/:id — Suppression d'un article. Réponse 200 avec message (jamais 204). */
export async function remove(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant d'article invalide" });
    return;
  }

  const resultat = await supprimerArticle(id);
  if (!resultat.ok) {
    res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message });
    return;
  }

  res.json({ success: true, message: "Article supprimé." });
}
