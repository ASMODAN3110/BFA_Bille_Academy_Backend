// Contrôleur Module 8 — Boutique (produits + devis) — BFA Bille Football Academy
// @EF41 : catalogue public (liste filtrable + détail)
// @EF42 : demande de devis publique (201 + emails best-effort)
// @EF43 : téléphone obligatoire (400, via validateur)
// @EF44 : CRUD admin des produits (201 à la création, upload S3 optionnel)
// @EF45 : suppression → 200 message (jamais 204)
// Le service traduit ses codes en statuts : PRODUIT_INTROUVABLE → 404, DEVIS_INTROUVABLE → 404.

import type { Request, Response } from "express";
import { uploadFile } from "../services/storageService";
import {
  CATEGORIES_PRODUIT,
  validateProductCreate,
  validateProductUpdate,
  validateQuoteCreate,
} from "../utils/shopValidator";
import {
  creerProduit,
  listerProduits,
  modifierProduit,
  obtenirProduit,
  supprimerProduit,
} from "../services/productService";
import {
  creerDevis,
  listerDevis,
  marquerDevisTraite,
  obtenirDevis,
} from "../services/quoteService";

/**
 * Convertit un paramètre d'URL en entier positif ; renvoie 0 si invalide.
 * Les types Express 5 typent `req.params.id` en `string | string[]`.
 */
function parseId(value: string | string[]): number {
  const v = Array.isArray(value) ? value[0] : value;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/** Statut HTTP associé au code d'erreur métier du service (défaut : 404). */
function statutPourCode(code?: string): number {
  switch (code) {
    case "PRODUIT_INTROUVABLE":
    case "DEVIS_INTROUVABLE":
    default:
      return 404;
  }
}

/** Ramène une valeur de `req.query` à une chaîne simple (ignore les tableaux). */
function queryString(valeur: unknown): string | undefined {
  return typeof valeur === "string" ? valeur : undefined;
}

/** `?estTraite=` / `?estNouveau=` → true | false | undefined. */
function lireBooleen(valeur: unknown): boolean | undefined {
  const s = queryString(valeur);
  if (s === undefined) return undefined;
  return s === "true" ? true : s === "false" ? false : undefined;
}

function lirePagination(req: Request): { page: number; limit: number } {
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? "10"), 10) || 10));
  return { page, limit };
}

/** Filtre commun catalogue : `?categorie=` (validé) + `?estNouveau=`. */
function filtresProduits(req: Request, res: Response): { categorie?: string; estNouveau?: boolean } | null {
  const categorie = queryString(req.query.categorie);
  const estNouveau = lireBooleen(req.query.estNouveau);
  if (categorie !== undefined && !(CATEGORIES_PRODUIT as readonly string[]).includes(categorie.trim())) {
    res.status(400).json({
      success: false,
      message: `La catégorie doit être l'une des suivantes : ${CATEGORIES_PRODUIT.join(", ")}.`,
    });
    return null;
  }
  return { categorie: categorie?.trim(), estNouveau };
}

/** GET /api/products — Catalogue public (@EF41). */
export async function getPublicProducts(req: Request, res: Response): Promise<void> {
  const { page, limit } = lirePagination(req);
  const filtres = filtresProduits(req, res);
  if (!filtres) return;
  const resultat = await listerProduits({ page, limit, ...filtres });
  res.json({ success: true, data: resultat.data });
}

/** GET /api/products/:id — Détail public (@EF41), 404 si absent. */
export async function getProductByIdPublic(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ success: false, message: "Identifiant de produit invalide" }); return; }
  const resultat = await obtenirProduit(id);
  if (!resultat.ok) { res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message }); return; }
  res.json({ success: true, data: resultat.data });
}

/** GET /admin/products — Liste admin (tous les produits, mêmes filtres). */
export async function getProducts(req: Request, res: Response): Promise<void> {
  const { page, limit } = lirePagination(req);
  const filtres = filtresProduits(req, res);
  if (!filtres) return;
  const resultat = await listerProduits({ page, limit, ...filtres });
  res.json({ success: true, data: resultat.data });
}

/** GET /admin/products/:id — Détail admin. */
export async function getProductById(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ success: false, message: "Identifiant de produit invalide" }); return; }
  const resultat = await obtenirProduit(id);
  if (!resultat.ok) { res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message }); return; }
  res.json({ success: true, data: resultat.data });
}

/**
 * POST /admin/products — Création (@EF44) → 201.
 * Accepte multipart (champ `file` = image optionnelle + champs texte, `tailles` en
 * chaîne JSON) OU JSON (sans image). Upload S3 dossier `boutique` si `req.file` présent.
 */
export async function createProduct(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const erreurs = validateProductCreate(body);
  if (erreurs.length > 0) {
    res.status(400).json({ success: false, message: erreurs[0], errors: erreurs });
    return;
  }

  let image: string | null = null;
  if (req.file) {
    const media = await uploadFile({
      dossier: "boutique",
      fichier: { buffer: req.file.buffer, mimetype: req.file.mimetype, originalname: req.file.originalname },
    });
    image = media.url;
  }

  const resultat = await creerProduit(body, image, req.user?.id ?? null);
  if (!resultat.ok) { res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message }); return; }
  res.status(201).json({ success: true, data: resultat.data });
}

/** PUT /admin/products/:id — Remplacement complet (@EF44). Mêmes validations. */
export async function updateProduct(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ success: false, message: "Identifiant de produit invalide" }); return; }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const erreurs = validateProductUpdate(body);
  if (erreurs.length > 0) {
    res.status(400).json({ success: false, message: erreurs[0], errors: erreurs });
    return;
  }

  let image: string | null = null;
  if (req.file) {
    const media = await uploadFile({
      dossier: "boutique",
      fichier: { buffer: req.file.buffer, mimetype: req.file.mimetype, originalname: req.file.originalname },
    });
    image = media.url;
  }

  const resultat = await modifierProduit(id, body, image, req.user?.id ?? null);
  if (!resultat.ok) { res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message }); return; }
  res.json({ success: true, data: resultat.data });
}

/** DELETE /admin/products/:id — Suppression (@EF45). Réponse 200 avec message (jamais 204). */
export async function deleteProduct(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ success: false, message: "Identifiant de produit invalide" }); return; }
  const resultat = await supprimerProduit(id);
  if (!resultat.ok) { res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message }); return; }
  res.json({ success: true, message: "Produit supprimé." });
}

/** POST /api/quotes — Demande de devis (@EF42, @EF43) → 201 + 2 emails best-effort. */
export async function createQuote(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const erreurs = validateQuoteCreate(body);
  if (erreurs.length > 0) {
    res.status(400).json({ success: false, message: erreurs[0], errors: erreurs });
    return;
  }

  const resultat = await creerDevis(body);
  if (!resultat.ok) { res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message }); return; }
  res.status(201).json({ success: true, data: resultat.data });
}

/** GET /admin/quotes — Liste paginée, tri dateDemande desc, filtre `?estTraite=`. */
export async function getQuotes(req: Request, res: Response): Promise<void> {
  const { page, limit } = lirePagination(req);
  const estTraite = lireBooleen(req.query.estTraite);
  const resultat = await listerDevis({ page, limit, estTraite });
  res.json({ success: true, data: resultat.data });
}

/** GET /admin/quotes/:id — Détail d'un devis. */
export async function getQuoteById(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ success: false, message: "Identifiant de devis invalide" }); return; }
  const resultat = await obtenirDevis(id);
  if (!resultat.ok) { res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message }); return; }
  res.json({ success: true, data: resultat.data });
}

/** PUT /admin/quotes/:id/treat — Marque le devis traité + enregistre l'admin. */
export async function markQuoteAsTreated(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ success: false, message: "Identifiant de devis invalide" }); return; }
  const resultat = await marquerDevisTraite(id, req.user?.id ?? null);
  if (!resultat.ok) { res.status(statutPourCode(resultat.code)).json({ success: false, message: resultat.message }); return; }
  res.json({ success: true, data: resultat.data });
}
