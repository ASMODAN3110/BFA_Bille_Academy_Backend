// Service Module 8 — Demandes de devis — BFA Bille Football Academy
// Création publique (@EF42 : vérifie le produit, envoie les emails best-effort)
// et gestion admin (liste, détail, marquage traité). Le stock n'est PAS décrémenté
// à la demande : un devis est une requête, pas un achat (gestion du stock via PUT produit).
// Convention service : `{ ok, data?, message?, code? }`, jamais d'erreur HTTP.

import prisma from "../config/database";
import type { Prisma, Taille } from "../../generated/prisma/client";
import { envoyerConfirmationDevis, envoyerNotificationDevis } from "./emailService";
import type { DevisAvecProduit } from "../templates/emailTemplates";

const includeProduit = { produit: true } satisfies Prisma.DevisInclude;

type CodeErreur = "DEVIS_INTROUVABLE" | "PRODUIT_INTROUVABLE";

export interface DevisOperation {
  ok: boolean;
  data?: DevisAvecProduit | ListeDevis;
  message?: string;
  code?: CodeErreur;
}

export interface ListeDevis {
  items: DevisAvecProduit[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * POST — Demande de devis (@EF42). Le téléphone est déjà garanti par le validateur
 * (@EF43). Vérifie le produit, enregistre, puis envoie les 2 emails (best-effort :
 * un échec d'envoi est loggé, jamais bloquant).
 */
export async function creerDevis(body: Record<string, unknown>): Promise<DevisOperation> {
  const produitId = Number(body.produitId);

  const produit = await prisma.produit.findUnique({
    where: { id: produitId },
    select: { id: true },
  });
  if (!produit) return { ok: false, code: "PRODUIT_INTROUVABLE", message: "Produit introuvable." };

  const data: Prisma.DevisUncheckedCreateInput = {
    nomComplet: String(body.nomComplet).trim(),
    email: String(body.email).trim(),
    telephone: String(body.telephone).trim(),
    quantite: Number(body.quantite),
    taille: body.taille ? (String(body.taille) as Taille) : null,
    message: body.message ? String(body.message).trim() : null,
    produitId,
  };

  const devis = await prisma.devis.create({ data, include: includeProduit });

  await Promise.allSettled([
    envoyerConfirmationDevis(devis),
    envoyerNotificationDevis(devis),
  ]);

  return { ok: true, data: devis };
}

/** GET — Liste paginée des devis, tri dateDemande desc, filtre `?estTraite=`. */
export async function listerDevis(params: {
  page: number;
  limit: number;
  estTraite?: boolean;
}): Promise<DevisOperation> {
  const { page, limit, estTraite } = params;

  const where: Prisma.DevisWhereInput = {};
  if (estTraite !== undefined) where.estTraite = estTraite;

  const [items, total] = await Promise.all([
    prisma.devis.findMany({
      where,
      include: includeProduit,
      orderBy: { dateDemande: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.devis.count({ where }),
  ]);

  return { ok: true, data: { items, total, page, limit, totalPages: Math.ceil(total / limit) } };
}

/** GET /:id — Détail d'un devis. */
export async function obtenirDevis(id: number): Promise<DevisOperation> {
  const devis = await prisma.devis.findUnique({ where: { id }, include: includeProduit });
  if (!devis) return { ok: false, code: "DEVIS_INTROUVABLE", message: "Demande de devis introuvable." };
  return { ok: true, data: devis };
}

/** PUT /:id/treat — Marque le devis traité et enregistre l'admin (relation `traitePar`). */
export async function marquerDevisTraite(
  id: number,
  adminId: number | null,
): Promise<DevisOperation> {
  const existant = await prisma.devis.findUnique({ where: { id }, select: { id: true } });
  if (!existant) return { ok: false, code: "DEVIS_INTROUVABLE", message: "Demande de devis introuvable." };

  const devis = await prisma.devis.update({
    where: { id },
    data: { estTraite: true, administrateurId: adminId },
    include: includeProduit,
  });
  return { ok: true, data: devis };
}
