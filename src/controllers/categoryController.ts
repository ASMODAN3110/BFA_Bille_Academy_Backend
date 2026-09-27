// Contrôleur Module 1 — Catégories — BFA Bille Football Academy
// GET    /api/categories       → liste des catégories d'âge (filtres publics + selects admin)
// POST   /admin/categories     → création d'une catégorie
// PUT    /admin/categories/:id → modification d'une catégorie
// DELETE /admin/categories/:id → suppression d'une catégorie
// Les tranches `[ageMin, ageMax]` sont lues en base (jamais codées en dur).

import type { Request, Response } from "express";
import prisma from "../config/database";
import { validateCategoryInput } from "../utils/categoryValidator";

/** Convertit un paramètre d'URL en entier positif ; renvoie 0 si invalide. */
function parseId(value: string | string[]): number {
  const v = Array.isArray(value) ? value[0] : value;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/** Liste des catégories, triées par tranche d'âge croissante. */
export async function getAll(_req: Request, res: Response): Promise<void> {
  const categories = await prisma.categorie.findMany({ orderBy: { ageMin: "asc" } });
  res.json({ success: true, data: categories });
}

/** POST /admin/categories — Création d'une catégorie. */
export async function create(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const erreurs = validateCategoryInput(body);
  if (erreurs.length > 0) {
    res.status(400).json({ success: false, message: erreurs[0], errors: erreurs });
    return;
  }

  const nom = (body.nom as string).trim();
  const ageMin = Number(body.ageMin);
  const ageMax = Number(body.ageMax);

  // Vérifier l'unicité du nom
  const existante = await prisma.categorie.findUnique({ where: { nom } });
  if (existante) {
    res.status(409).json({ success: false, message: `La catégorie « ${nom} » existe déjà.` });
    return;
  }

  // Vérifier qu'aucune catégorie existante ne chevauche la tranche d'âge
  const chevauchante = await prisma.categorie.findFirst({
    where: {
      OR: [
        { ageMin: { lte: ageMin }, ageMax: { gte: ageMin } },
        { ageMin: { lte: ageMax }, ageMax: { gte: ageMax } },
        { ageMin: { gte: ageMin }, ageMax: { lte: ageMax } },
      ],
    },
  });
  if (chevauchante) {
    res.status(409).json({
      success: false,
      message: `La tranche d'âge ${ageMin}-${ageMax} ans chevauche la catégorie « ${chevauchante.nom} » (${chevauchante.ageMin}-${chevauchante.ageMax} ans).`,
    });
    return;
  }

  const categorie = await prisma.categorie.create({
    data: { nom, ageMin, ageMax },
  });

  res.status(201).json({ success: true, data: categorie });
}

/** PUT /admin/categories/:id — Modification d'une catégorie. */
export async function update(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant de catégorie invalide" });
    return;
  }

  const existant = await prisma.categorie.findUnique({ where: { id } });
  if (!existant) {
    res.status(404).json({ success: false, message: "Catégorie introuvable" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const fusion = {
    nom: body.nom !== undefined ? body.nom : existant.nom,
    ageMin: body.ageMin !== undefined ? body.ageMin : existant.ageMin,
    ageMax: body.ageMax !== undefined ? body.ageMax : existant.ageMax,
  };

  const erreurs = validateCategoryInput(fusion);
  if (erreurs.length > 0) {
    res.status(400).json({ success: false, message: erreurs[0], errors: erreurs });
    return;
  }

  const nom = (fusion.nom as string).trim();
  const ageMin = Number(fusion.ageMin);
  const ageMax = Number(fusion.ageMax);

  // Vérifier l'unicité du nom (exclure la catégorie courante)
  const doublon = await prisma.categorie.findFirst({
    where: { nom, NOT: { id } },
  });
  if (doublon) {
    res.status(409).json({ success: false, message: `La catégorie « ${nom} » existe déjà.` });
    return;
  }

  // Vérifier qu'aucune autre catégorie ne chevauche la tranche
  const chevauchante = await prisma.categorie.findFirst({
    where: {
      NOT: { id },
      OR: [
        { ageMin: { lte: ageMin }, ageMax: { gte: ageMin } },
        { ageMin: { lte: ageMax }, ageMax: { gte: ageMax } },
        { ageMin: { gte: ageMin }, ageMax: { lte: ageMax } },
      ],
    },
  });
  if (chevauchante) {
    res.status(409).json({
      success: false,
      message: `La tranche d'âge ${ageMin}-${ageMax} ans chevauche la catégorie « ${chevauchante.nom} » (${chevauchante.ageMin}-${chevauchante.ageMax} ans).`,
    });
    return;
  }

  const categorie = await prisma.categorie.update({
    where: { id },
    data: { nom, ageMin, ageMax },
  });

  res.json({ success: true, data: categorie });
}

/** DELETE /admin/categories/:id — Suppression d'une catégorie. */
export async function remove(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant de catégorie invalide" });
    return;
  }

  const existant = await prisma.categorie.findUnique({
    where: { id },
    include: { _count: { select: { joueurs: true, evenements: true, resultats: true } } },
  });
  if (!existant) {
    res.status(404).json({ success: false, message: "Catégorie introuvable" });
    return;
  }

  // Refuser la suppression si des entités sont liées
  const total = existant._count.joueurs + existant._count.evenements + existant._count.resultats;
  if (total > 0) {
    res.status(409).json({
      success: false,
      message: `Impossible de supprimer cette catégorie : ${existant._count.joueurs} joueur(s), ${existant._count.evenements} événement(s) et ${existant._count.resultats} résultat(s) y sont liés. Supprimez d'abord ces éléments ou réaffectez-les.`,
    });
    return;
  }

  await prisma.categorie.delete({ where: { id } });
  res.json({ success: true, message: "Catégorie supprimée avec succès" });
}
