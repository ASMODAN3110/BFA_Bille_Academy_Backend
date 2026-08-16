// Contrôleur Module 1 — Joueurs — BFA Bille Football Academy
// @EF1 : liste filtrée/paginée · @EF2 : fiche détaillée · @EF3/@EF4/@EF5 : création
// @EF6 : modification · @EF7 : suppression.
// Accès DB via le singleton centralisé dans `src/config/database.ts`.
// Express 5 : pas de wrapper async — le contrôleur répond explicitement pour les cas
// attendus (400/404) ; les erreurs inattendues remontent au middleware d'erreur de `app.ts`.

import type { Request, Response } from "express";
import prisma from "../config/database";
import { validatePlayerInput } from "../utils/playerValidator";
import { verifierAgeEtCategorie, verifierAgeMinimum } from "../services/playerService";

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
 * GET /api/players — Liste publique des joueurs (@EF1).
 * Query : `page` (défaut 1), `limit` (défaut 20, max 100), `categorieId` (optionnel).
 * Tri alphabétique (nom, prénom) + pagination.
 */
export async function getAll(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? "20"), 10) || 20));

  const rawCategorieId = req.query.categorieId;
  let where = {};
  if (rawCategorieId !== undefined) {
    const categorieId = Number(rawCategorieId);
    if (!Number.isInteger(categorieId) || categorieId <= 0) {
      res.status(400).json({ success: false, message: "Le filtre categorieId doit être un entier positif" });
      return;
    }
    where = { categorieId };
  }

  const [items, total] = await Promise.all([
    prisma.joueur.findMany({
      where,
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: { categorie: { select: { id: true, nom: true } } },
    }),
    prisma.joueur.count({ where }),
  ]);

  res.json({
    success: true,
    data: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

/**
 * GET /api/players/:id — Fiche détaillée d'un joueur (@EF2), catégorie incluse.
 */
export async function getById(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant de joueur invalide" });
    return;
  }

  const joueur = await prisma.joueur.findUnique({
    where: { id },
    include: { categorie: true },
  });

  if (!joueur) {
    res.status(404).json({ success: false, message: "Joueur introuvable" });
    return;
  }

  res.json({ success: true, data: joueur });
}

/**
 * POST /admin/players — Création d'un joueur (@EF3).
 * Validation des champs, âge minimum (@EF5), catégorie existante + tranche d'âge (@EF4).
 */
export async function create(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const erreurs = validatePlayerInput(body);
  if (erreurs.length > 0) {
    res.status(400).json({ success: false, message: erreurs[0], errors: erreurs });
    return;
  }

  const dateNaissance = new Date(body.dateNaissance as string);

  const ageMin = verifierAgeMinimum(dateNaissance);
  if (!ageMin.ok) {
    res.status(400).json({ success: false, message: ageMin.message });
    return;
  }

  const categorieId = Number(body.categorieId);
  const categorie = await prisma.categorie.findUnique({ where: { id: categorieId } });
  if (!categorie) {
    res.status(404).json({ success: false, message: "Catégorie introuvable" });
    return;
  }

  const dansCategorie = verifierAgeEtCategorie(dateNaissance, categorie);
  if (!dansCategorie.ok) {
    res.status(400).json({ success: false, message: dansCategorie.message });
    return;
  }

  const joueur = await prisma.joueur.create({
    data: {
      nom: (body.nom as string).trim(),
      prenom: (body.prenom as string).trim(),
      dateNaissance,
      poste: (body.poste as string).trim(),
      photo: body.photo !== undefined && body.photo !== null ? (body.photo as string) : null,
      categorieId,
      administrateurId: req.user?.id ?? null,
    },
    include: { categorie: true },
  });

  res.status(201).json({ success: true, data: joueur });
}

/**
 * PUT /admin/players/:id — Modification d'un joueur (@EF6).
 * Fusion des champs fournis avec les valeurs existantes, puis mêmes validations que la
 * création (body + âge minimum + catégorie) : un update partiel reste donc cohérent.
 */
export async function update(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant de joueur invalide" });
    return;
  }

  const existant = await prisma.joueur.findUnique({ where: { id } });
  if (!existant) {
    res.status(404).json({ success: false, message: "Joueur introuvable" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;

  // Champs fournis seulement → fusion avec le joueur existant, puis validation de l'ensemble.
  const fusion = {
    nom: body.nom !== undefined ? body.nom : existant.nom,
    prenom: body.prenom !== undefined ? body.prenom : existant.prenom,
    dateNaissance:
      body.dateNaissance !== undefined ? body.dateNaissance : existant.dateNaissance.toISOString(),
    poste: body.poste !== undefined ? body.poste : existant.poste,
    categorieId: body.categorieId !== undefined ? body.categorieId : existant.categorieId,
    photo: body.photo !== undefined ? body.photo : existant.photo,
  };

  const erreurs = validatePlayerInput(fusion);
  if (erreurs.length > 0) {
    res.status(400).json({ success: false, message: erreurs[0], errors: erreurs });
    return;
  }

  const dateNaissance = new Date(fusion.dateNaissance as string);

  const ageMin = verifierAgeMinimum(dateNaissance);
  if (!ageMin.ok) {
    res.status(400).json({ success: false, message: ageMin.message });
    return;
  }

  const categorieId = Number(fusion.categorieId);
  const categorie = await prisma.categorie.findUnique({ where: { id: categorieId } });
  if (!categorie) {
    res.status(404).json({ success: false, message: "Catégorie introuvable" });
    return;
  }

  const dansCategorie = verifierAgeEtCategorie(dateNaissance, categorie);
  if (!dansCategorie.ok) {
    res.status(400).json({ success: false, message: dansCategorie.message });
    return;
  }

  const joueur = await prisma.joueur.update({
    where: { id },
    data: {
      nom: (fusion.nom as string).trim(),
      prenom: (fusion.prenom as string).trim(),
      dateNaissance,
      poste: (fusion.poste as string).trim(),
      photo: fusion.photo !== undefined && fusion.photo !== null ? (fusion.photo as string) : null,
      categorieId,
    },
    include: { categorie: true },
  });

  res.json({ success: true, data: joueur });
}

/**
 * DELETE /admin/players/:id — Suppression d'un joueur (@EF7).
 */
export async function remove(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant de joueur invalide" });
    return;
  }

  const existant = await prisma.joueur.findUnique({ where: { id }, select: { id: true } });
  if (!existant) {
    res.status(404).json({ success: false, message: "Joueur introuvable" });
    return;
  }

  await prisma.joueur.delete({ where: { id } });

  res.json({ success: true, message: "Joueur supprimé" });
}
