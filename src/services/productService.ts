// Service Module 8 — Produits de la boutique — BFA Bille Football Academy
// CRUD des produits. L'image est gérée par le contrôleur (upload S3 via
// `storageService`) puis passée ici comme URL ; ce service ne fait que la
// stocker et la supprimer (clé extraite de l'URL) quand nécessaire.
// Convention service : `{ ok, data?, message?, code? }`, jamais d'erreur HTTP.

import prisma from "../config/database";
import type { Prisma, Taille } from "../../generated/prisma/client";
import { BUCKET, S3_PUBLIC_URL } from "../config/s3";
import { deleteFile } from "./storageService";

type CodeErreur = "PRODUIT_INTROUVABLE";

export interface ProduitOperation {
  ok: boolean;
  data?: Prisma.ProduitGetPayload<{}> | ListeProduits;
  message?: string;
  code?: CodeErreur;
}

export interface ListeProduits {
  items: Prisma.ProduitGetPayload<{}>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Vrai si l'URL pointe vers MinIO (une URL locale `/images/...` du seed n'est PAS touchée). */
function estUrlS3(url: string | null | undefined): url is string {
  return typeof url === "string" && url.startsWith(`${S3_PUBLIC_URL}/${BUCKET}/`);
}

/** Extrait la clé S3 d'une URL publique. */
function extraireCle(url: string): string | null {
  const prefix = `${S3_PUBLIC_URL}/${BUCKET}/`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}

/** GET — Liste paginée, filtres `?categorie=` et `?estNouveau=` (@EF41). */
export async function listerProduits(params: {
  page: number;
  limit: number;
  categorie?: string;
  estNouveau?: boolean;
}): Promise<ProduitOperation> {
  const { page, limit, categorie, estNouveau } = params;

  const where: Prisma.ProduitWhereInput = {};
  if (categorie !== undefined) where.categorie = categorie;
  if (estNouveau !== undefined) where.estNouveau = estNouveau;

  const [items, total] = await Promise.all([
    prisma.produit.findMany({
      where,
      orderBy: { nom: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.produit.count({ where }),
  ]);

  return { ok: true, data: { items, total, page, limit, totalPages: Math.ceil(total / limit) } };
}

/** GET /:id — Détail d'un produit. */
export async function obtenirProduit(id: number): Promise<ProduitOperation> {
  const produit = await prisma.produit.findUnique({ where: { id } });
  if (!produit) return { ok: false, code: "PRODUIT_INTROUVABLE", message: "Produit introuvable." };
  return { ok: true, data: produit };
}

/** Payload Prisma d'un produit (body déjà validé par `shopValidator`). */
function payloadProduit(
  body: Record<string, unknown>,
  image: string | null,
  adminId: number | null,
): Prisma.ProduitUncheckedCreateInput {
  return {
    nom: String(body.nom).trim(),
    description: String(body.description).trim(),
    prix: Number(body.prix),
    image,
    tailles: (typeof body.tailles === "string" ? JSON.parse(body.tailles) : body.tailles) as Taille[],
    categorie: String(body.categorie).trim(),
    estNouveau: body.estNouveau === "true" || body.estNouveau === true,
    stock: Number(body.stock ?? 0),
    administrateurId: adminId,
  };
}

/** POST — Création d'un produit (@EF44). `image` = URL S3 ou null. */
export async function creerProduit(
  body: Record<string, unknown>,
  image: string | null,
  adminId: number | null,
): Promise<ProduitOperation> {
  const produit = await prisma.produit.create({ data: payloadProduit(body, image, adminId) });
  return { ok: true, data: produit };
}

/**
 * PUT /:id — Remplacement complet (@EF44). `image` non nul = nouvelle URL S3 :
 * l'ancienne image S3 (si existante) est supprimée. Une URL locale du seed est conservée.
 */
export async function modifierProduit(
  id: number,
  body: Record<string, unknown>,
  image: string | null,
  adminId: number | null,
): Promise<ProduitOperation> {
  const existant = await prisma.produit.findUnique({ where: { id } });
  if (!existant) return { ok: false, code: "PRODUIT_INTROUVABLE", message: "Produit introuvable." };

  const produit = await prisma.produit.update({
    where: { id },
    data: payloadProduit(body, image ?? existant.image, adminId),
  });

  if (image !== null && estUrlS3(existant.image)) {
    const cle = extraireCle(existant.image);
    if (cle) await deleteFile(cle);
  }
  return { ok: true, data: produit };
}

/** DELETE /:id — Suppression (@EF45), puis suppression de l'image S3 si présente. */
export async function supprimerProduit(id: number): Promise<ProduitOperation> {
  const existant = await prisma.produit.findUnique({ where: { id } });
  if (!existant) return { ok: false, code: "PRODUIT_INTROUVABLE", message: "Produit introuvable." };

  await prisma.produit.delete({ where: { id } });

  if (estUrlS3(existant.image)) {
    const cle = extraireCle(existant.image);
    if (cle) await deleteFile(cle);
  }
  return { ok: true };
}
