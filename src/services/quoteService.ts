// Service Module 8 — Demandes de devis — BFA Bille Football Academy
// Création publique (@EF42 : vérifie le produit, envoie les emails best-effort)
// et gestion admin (liste, détail, marquage traité). Le stock n'est PAS décrémenté
// à la demande : un devis est une requête, pas un achat (gestion du stock via PUT produit).
// Convention service : `{ ok, data?, message?, code? }`, jamais d'erreur HTTP.

import prisma from "../config/database";
import type { Prisma, Taille } from "../../generated/prisma/client";
import { envoyerConfirmationDevis, envoyerNotificationDevis } from "./emailService";
import type { DevisAvecLignes } from "../templates/emailTemplates";
import { lignesDuDevis, type LigneDevisBrute } from "../utils/shopValidator";

/** Un devis est toujours lu avec ses lignes, dans l'ordre de saisie. */
const includeLignes = { lignes: { orderBy: { id: "asc" } } } satisfies Prisma.DevisInclude;

type CodeErreur = "DEVIS_INTROUVABLE" | "PRODUIT_INTROUVABLE";

export interface DevisOperation {
  ok: boolean;
  data?: DevisAvecLignes | ListeDevis;
  message?: string;
  code?: CodeErreur;
}

export interface ListeDevis {
  items: DevisAvecLignes[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Ligne normalisée : même produit + même taille = une seule ligne (quantités additionnées). */
interface LigneNormalisee {
  produitId: number;
  taille: Taille | null;
  quantite: number;
}

function normaliserLignes(body: Record<string, unknown>): LigneNormalisee[] {
  const brutes: LigneDevisBrute[] = lignesDuDevis(body) ?? [];
  const fusion = new Map<string, LigneNormalisee>();
  for (const l of brutes) {
    const produitId = Number(l.produitId);
    const taille = l.taille ? (String(l.taille) as Taille) : null;
    const quantite = Number(l.quantite);
    const cle = `${produitId}|${taille ?? ""}`;
    const existante = fusion.get(cle);
    if (existante) existante.quantite += quantite;
    else fusion.set(cle, { produitId, taille, quantite });
  }
  return [...fusion.values()];
}

/**
 * POST — Demande de devis (@EF42) pour un ou plusieurs articles. Le téléphone est déjà
 * garanti par le validateur (@EF43). Vérifie que tous les produits existent, enregistre
 * le devis avec ses lignes (le nom du produit est copié dans chaque ligne), puis envoie
 * les 2 emails (best-effort : un échec d'envoi est loggé, jamais bloquant).
 */
export async function creerDevis(body: Record<string, unknown>): Promise<DevisOperation> {
  const lignes = normaliserLignes(body);

  const ids = [...new Set(lignes.map((l) => l.produitId))];
  const produits = await prisma.produit.findMany({
    where: { id: { in: ids } },
    select: { id: true, nom: true, stock: true },
  });
  const nomParId = new Map(produits.map((p) => [p.id, p.nom]));
  if (ids.some((id) => !nomParId.has(id)))
    return { ok: false, code: "PRODUIT_INTROUVABLE", message: "Produit introuvable." };

  // Les produits en rupture de stock ne sont plus proposés dans la boutique : pas de devis dessus.
  const enRupture = produits.filter((p) => p.stock <= 0);
  if (enRupture.length > 0)
    return {
      ok: false,
      code: "PRODUIT_INTROUVABLE",
      message: `Produit indisponible (rupture de stock) : ${enRupture.map((p) => p.nom).join(", ")}.`,
    };

  const data: Prisma.DevisCreateInput = {
    nomComplet: String(body.nomComplet).trim(),
    email: String(body.email).trim(),
    telephone: String(body.telephone).trim(),
    message: body.message ? String(body.message).trim() : null,
    lignes: {
      create: lignes.map((l) => ({
        produit: { connect: { id: l.produitId } },
        produitNom: nomParId.get(l.produitId) as string,
        quantite: l.quantite,
        taille: l.taille,
      })),
    },
  };

  const devis = await prisma.devis.create({ data, include: includeLignes });

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
      include: includeLignes,
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
  const devis = await prisma.devis.findUnique({ where: { id }, include: includeLignes });
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
    include: includeLignes,
  });
  return { ok: true, data: devis };
}
