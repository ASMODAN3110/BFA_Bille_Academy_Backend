// Contrôleur Module 2 — Événements — BFA Bille Football Academy
// @EF8 : calendrier mensuel (filtre `month`) · @EF9 : filtre catégorie · @EF10 : filtre type
// @EF11/@EF12 : création · @EF13 : modification · @EF14 : suppression.
// Accès DB via le singleton centralisé dans `src/config/database.ts`.
// Express 5 : pas de wrapper async — le contrôleur répond explicitement pour les cas
// attendus (400/404) ; les erreurs inattendues remontent au middleware d'erreur de `app.ts`.

import type { Request, Response } from "express";
import type { Prisma } from "../../generated/prisma/client";
import prisma from "../config/database";
import { validateEventInput } from "../utils/eventValidator";
import {
  calculerFenetreMois,
  verifierChampsParType,
  type TypeEvenement,
} from "../services/eventService";

/**
 * Convertit un paramètre d'URL en entier positif ; renvoie 0 si invalide (<= 0 ou non entier).
 * Les types Express 5 typent `req.params.id` en `string | string[]` (paramètres répétables).
 */
function parseId(value: string | string[]): number {
  const v = Array.isArray(value) ? value[0] : value;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/** Vrai si `value` est une chaîne "YYYY-MM" avec un mois valide (01–12). */
function estMoisValide(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const mois = Number(value.slice(5, 7));
  return mois >= 1 && mois <= 12;
}

/** Valeurs de l'enum Prisma `TypeMatch` (AMICAL / CHAMPIONNAT). */
type TypeMatch = "AMICAL" | "CHAMPIONNAT";

/** Champs spécifiques à un type d'événement (l'autre type est forcé à `null`). */
interface ChampsSpecifiques {
  equipeA: string | null;
  equipeB: string | null;
  typeMatch: TypeMatch | null;
  scoreA: number | null;
  scoreB: number | null;
  objectif: string | null;
  duree: number | null;
}

/**
 * Construit les champs spécifiques au type de l'événement depuis un body (ou une fusion) validé.
 * Les champs de l'autre type sont forcés à `null` : changer un MATCH en ENTRAINEMENT (ou
 * l'inverse) remet ainsi automatiquement les champs obsolètes à null.
 */
function buildChampsSpecifiques(type: TypeEvenement, body: Record<string, unknown>): ChampsSpecifiques {
  if (type === "MATCH") {
    return {
      equipeA: (body.equipeA as string).trim(),
      equipeB: (body.equipeB as string).trim(),
      typeMatch: body.typeMatch !== undefined && body.typeMatch !== null ? (body.typeMatch as TypeMatch) : null,
      scoreA: body.scoreA !== undefined && body.scoreA !== null ? Number(body.scoreA) : null,
      scoreB: body.scoreB !== undefined && body.scoreB !== null ? Number(body.scoreB) : null,
      objectif: null,
      duree: null,
    };
  }
  return {
    equipeA: null,
    equipeB: null,
    typeMatch: null,
    scoreA: null,
    scoreB: null,
    objectif: body.objectif !== undefined && body.objectif !== null ? (body.objectif as string).trim() : null,
    duree: body.duree !== undefined && body.duree !== null ? Number(body.duree) : null,
  };
}

/**
 * GET /api/events — Liste publique des événements (@EF8/@EF9/@EF10).
 * Query : `page` (défaut 1), `limit` (défaut 20, max 100), `categorieId` (entier positif),
 * `type` (MATCH|ENTRAINEMENT), `month` ("YYYY-MM"). Filtres combinables.
 * Tri date croissante puis heure croissante + pagination.
 */
export async function getAll(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? "20"), 10) || 20));

  const where: Prisma.EvenementWhereInput = {};

  const rawCategorieId = req.query.categorieId;
  if (rawCategorieId !== undefined) {
    const categorieId = Number(rawCategorieId);
    if (!Number.isInteger(categorieId) || categorieId <= 0) {
      res.status(400).json({ success: false, message: "Le filtre categorieId doit être un entier positif" });
      return;
    }
    where.categorieId = categorieId;
  }

  const rawType = req.query.type;
  if (rawType !== undefined) {
    const type = String(rawType);
    if (type !== "MATCH" && type !== "ENTRAINEMENT") {
      res.status(400).json({ success: false, message: "Le filtre type doit être MATCH ou ENTRAINEMENT" });
      return;
    }
    where.type = type;
  }

  const rawMonth = req.query.month;
  if (rawMonth !== undefined) {
    if (!estMoisValide(rawMonth)) {
      res.status(400).json({ success: false, message: "Le filtre month doit être au format YYYY-MM (ex: 2026-08)" });
      return;
    }
    where.date = calculerFenetreMois(rawMonth);
  }

  const [items, total] = await Promise.all([
    prisma.evenement.findMany({
      where,
      orderBy: [{ date: "asc" }, { heure: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: { categorie: { select: { id: true, nom: true } } },
    }),
    prisma.evenement.count({ where }),
  ]);

  res.json({
    success: true,
    data: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

/**
 * GET /api/events/:id — Fiche détaillée d'un événement, catégorie incluse.
 */
export async function getById(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant d'événement invalide" });
    return;
  }

  const evenement = await prisma.evenement.findUnique({
    where: { id },
    include: { categorie: true },
  });

  if (!evenement) {
    res.status(404).json({ success: false, message: "Événement introuvable" });
    return;
  }

  res.json({ success: true, data: evenement });
}

/**
 * POST /admin/events — Création d'un événement (@EF11).
 * Validation des champs + type obligatoire (@EF12) + cohérence type/champs + catégorie existante.
 */
export async function create(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const erreurs = validateEventInput(body);
  if (erreurs.length > 0) {
    res.status(400).json({ success: false, message: erreurs[0], errors: erreurs });
    return;
  }

  const type = body.type as TypeEvenement;

  const coherence = verifierChampsParType(type, body);
  if (!coherence.ok) {
    res.status(400).json({ success: false, message: coherence.message });
    return;
  }

  const categorieId = Number(body.categorieId);
  const categorie = await prisma.categorie.findUnique({ where: { id: categorieId } });
  if (!categorie) {
    res.status(404).json({ success: false, message: "Catégorie introuvable" });
    return;
  }

  const evenement = await prisma.evenement.create({
    data: {
      titre: (body.titre as string).trim(),
      date: new Date(body.date as string),
      heure: (body.heure as string).trim(),
      lieu: (body.lieu as string).trim(),
      type,
      categorieId,
      administrateurId: req.user?.id ?? null,
      ...buildChampsSpecifiques(type, body),
    },
    include: { categorie: true },
  });

  res.status(201).json({ success: true, data: evenement });
}

/**
 * PUT /admin/events/:id — Modification d'un événement (@EF13).
 * Fusion des champs fournis avec les valeurs existantes, puis mêmes validations que la
 * création (update partiel) : un PUT ne portant que sur `lieu` conserve le reste.
 */
export async function update(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant d'événement invalide" });
    return;
  }

  const existant = await prisma.evenement.findUnique({ where: { id } });
  if (!existant) {
    res.status(404).json({ success: false, message: "Événement introuvable" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;

  // Champs fournis seulement → fusion avec l'événement existant, puis validation de l'ensemble.
  const fusion = {
    titre: body.titre !== undefined ? body.titre : existant.titre,
    date: body.date !== undefined ? body.date : existant.date.toISOString(),
    heure: body.heure !== undefined ? body.heure : existant.heure,
    lieu: body.lieu !== undefined ? body.lieu : existant.lieu,
    type: body.type !== undefined ? body.type : existant.type,
    categorieId: body.categorieId !== undefined ? body.categorieId : existant.categorieId,
    equipeA: body.equipeA !== undefined ? body.equipeA : existant.equipeA,
    equipeB: body.equipeB !== undefined ? body.equipeB : existant.equipeB,
    typeMatch: body.typeMatch !== undefined ? body.typeMatch : existant.typeMatch,
    scoreA: body.scoreA !== undefined ? body.scoreA : existant.scoreA,
    scoreB: body.scoreB !== undefined ? body.scoreB : existant.scoreB,
    objectif: body.objectif !== undefined ? body.objectif : existant.objectif,
    duree: body.duree !== undefined ? body.duree : existant.duree,
  };

  const erreurs = validateEventInput(fusion);
  if (erreurs.length > 0) {
    res.status(400).json({ success: false, message: erreurs[0], errors: erreurs });
    return;
  }

  const type = fusion.type as TypeEvenement;

  const coherence = verifierChampsParType(type, fusion);
  if (!coherence.ok) {
    res.status(400).json({ success: false, message: coherence.message });
    return;
  }

  const categorieId = Number(fusion.categorieId);
  const categorie = await prisma.categorie.findUnique({ where: { id: categorieId } });
  if (!categorie) {
    res.status(404).json({ success: false, message: "Catégorie introuvable" });
    return;
  }

  const evenement = await prisma.evenement.update({
    where: { id },
    data: {
      titre: (fusion.titre as string).trim(),
      date: new Date(fusion.date as string),
      heure: (fusion.heure as string).trim(),
      lieu: (fusion.lieu as string).trim(),
      type,
      categorieId,
      ...buildChampsSpecifiques(type, fusion),
    },
    include: { categorie: true },
  });

  res.json({ success: true, data: evenement });
}

/**
 * DELETE /admin/events/:id — Suppression d'un événement (@EF14).
 */
export async function remove(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant d'événement invalide" });
    return;
  }

  const existant = await prisma.evenement.findUnique({ where: { id }, select: { id: true } });
  if (!existant) {
    res.status(404).json({ success: false, message: "Événement introuvable" });
    return;
  }

  await prisma.evenement.delete({ where: { id } });

  res.json({ success: true, message: "Événement supprimé" });
}
