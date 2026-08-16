// Contrôleur Module 1 — Catégories — BFA Bille Football Academy
// GET /api/categories → liste des catégories d'âge (filtres publics + selects admin).
// Les tranches `[ageMin, ageMax]` sont lues en base (jamais codées en dur).

import type { Request, Response } from "express";
import prisma from "../config/database";

/** Liste des catégories, triées par tranche d'âge croissante. */
export async function getAll(_req: Request, res: Response): Promise<void> {
  const categories = await prisma.categorie.findMany({ orderBy: { ageMin: "asc" } });
  res.json({ success: true, data: categories });
}
