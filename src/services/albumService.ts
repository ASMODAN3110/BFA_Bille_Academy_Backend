// Service Module 4 — Règles métier des albums et médias — BFA Bille Football Academy
// Le service renvoie un résultat `{ ok, data?, message?, code? }` et ne lève JAMAIS
// d'erreur HTTP : le contrôleur traduit `code` en statut (400/404).
// Même convention que `eventService.ts` / `trialService.ts`.
//
// Médias : chaque média est un objet `{ id, key, url, type, nom }` stocké dans le champ
// Json `medias` de l'album. La suppression des fichiers S3 est best-effort : un échec
// de MinIO est loggé mais ne bloque jamais la mise à jour en base.

import { randomUUID } from "node:crypto";
import prisma from "../config/database";
import type { Album, Prisma } from "../../generated/prisma/client";
import { deleteFile, uploadMany } from "./storageService";
import type { ThemeAlbum } from "../utils/albumValidator";

/**
 * Structure d'un média dans le Json `medias` de l'album (@EF20/@EF24).
 * Type alias d'objet littéral (et non interface) : TS lui attribue une index signature
 * implicite, ce qui le rend assignable aux types Prisma `JsonObject`/`InputJsonValue`.
 */
export type AlbumMedia = {
  id: string;
  key: string;
  url: string;
  type: "image" | "video";
  nom: string;
};

/** Liste paginée des albums (enveloppe convention du projet). */
export interface ListeAlbums {
  items: Album[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Résultat d'une opération du service : données facultatives + code d'erreur métier.
 * `code` n'est renseigné que quand `ok` est faux et guide le statut HTTP :
 * - "INTROUVABLE" → 404
 * - "MEDIA_INTROUVABLE" → 404
 */
export interface ResultatAlbum {
  ok: boolean;
  data?: Album | ListeAlbums;
  message?: string;
  code?: "INTROUVABLE" | "MEDIA_INTROUVABLE";
}

/** Type du média à partir du mimetype (image/* → image, sinon vidéo). */
function typeDeMimetype(mimetype: string): "image" | "video" {
  return mimetype.startsWith("image/") ? "image" : "video";
}

/**
 * Extrait le tableau de médias bien formés du champ Json `medias`.
 * Les entrées corrompues (format ancien, structure partielle) sont ignorées.
 */
export function lireMedias(medias: Prisma.JsonValue): AlbumMedia[] {
  if (!Array.isArray(medias)) return [];
  return medias.filter((m): m is AlbumMedia => {
    if (typeof m !== "object" || m === null) return false;
    const x = m as Record<string, unknown>;
    return (
      typeof x.id === "string" &&
      typeof x.key === "string" &&
      typeof x.url === "string" &&
      (x.type === "image" || x.type === "video") &&
      typeof x.nom === "string"
    );
  });
}

/**
 * Liste paginée des albums avec filtre thème optionnel (@EF21).
 * Tri `dateCreation` décroissante (les plus récents d'abord).
 */
export async function listerAlbums(params: {
  page: number;
  limit: number;
  theme?: ThemeAlbum;
}): Promise<ResultatAlbum> {
  const { page, limit, theme } = params;

  const where: Prisma.AlbumWhereInput = theme ? { theme } : {};

  const [items, total] = await Promise.all([
    prisma.album.findMany({
      where,
      orderBy: { dateCreation: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.album.count({ where }),
  ]);

  return {
    ok: true,
    data: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

/** Fiche détaillée d'un album (médias inclus) (@EF20). */
export async function obtenirAlbum(id: number): Promise<ResultatAlbum> {
  const album = await prisma.album.findUnique({ where: { id } });
  if (!album) {
    return { ok: false, code: "INTROUVABLE", message: "Album introuvable." };
  }
  return { ok: true, data: album };
}

/**
 * Crée un album (@EF22) : titre, description, thème, liste de médias vide.
 * La description vide ou absente est normalisée à `null`.
 */
export async function creerAlbum(
  body: Record<string, unknown>,
  administrateurId: number | null
): Promise<ResultatAlbum> {
  const description =
    typeof body.description === "string" && body.description.trim() !== ""
      ? body.description.trim()
      : null;

  const album = await prisma.album.create({
    data: {
      titre: (body.titre as string).trim(),
      description,
      theme: body.theme as string,
      medias: [],
      administrateurId,
    },
  });

  return { ok: true, data: album };
}

/**
 * Modifie un album (@EF22) : titre, description, thème.
 * La liste `medias` n'est pas modifiée par cet endpoint (elle l'est via l'upload
 * et la suppression de média).
 */
export async function modifierAlbum(
  id: number,
  body: Record<string, unknown>
): Promise<ResultatAlbum> {
  const existant = await prisma.album.findUnique({ where: { id }, select: { id: true } });
  if (!existant) {
    return { ok: false, code: "INTROUVABLE", message: "Album introuvable." };
  }

  const description =
    typeof body.description === "string" && body.description.trim() !== ""
      ? body.description.trim()
      : null;

  const album = await prisma.album.update({
    where: { id },
    data: {
      titre: (body.titre as string).trim(),
      description,
      theme: body.theme as string,
    },
  });

  return { ok: true, data: album };
}

/**
 * Supprime un album et ses fichiers S3 (@EF22).
 * Suppression S3 best-effort : un échec de MinIO est loggé, la suppression en base a lieu.
 */
export async function supprimerAlbum(id: number): Promise<ResultatAlbum> {
  const existant = await prisma.album.findUnique({ where: { id }, select: { id: true, medias: true } });
  if (!existant) {
    return { ok: false, code: "INTROUVABLE", message: "Album introuvable." };
  }

  for (const media of lireMedias(existant.medias)) {
    try {
      await deleteFile(media.key);
    } catch (err) {
      console.error(`[S3] Échec suppression ${media.key} :`, err);
    }
  }

  await prisma.album.delete({ where: { id } });

  return { ok: true };
}

/**
 * Ajoute des médias à un album (@EF22/@EF23) : upload sur MinIO (dossier `galerie`),
 * enrichissement en objets `AlbumMedia` (id, type, nom), ajout à la liste existante.
 */
export async function ajouterMedias(
  id: number,
  fichiers: { buffer: Buffer; mimetype: string; originalname: string }[]
): Promise<ResultatAlbum> {
  const existant = await prisma.album.findUnique({ where: { id }, select: { id: true, medias: true } });
  if (!existant) {
    return { ok: false, code: "INTROUVABLE", message: "Album introuvable." };
  }

  const stockes = await uploadMany({ dossier: "galerie", fichiers });
  const nouveaux: AlbumMedia[] = stockes.map((stocke, index) => ({
    id: randomUUID(),
    key: stocke.key,
    url: stocke.url,
    type: typeDeMimetype(fichiers[index].mimetype),
    nom: fichiers[index].originalname,
  }));

  const album = await prisma.album.update({
    where: { id },
    data: { medias: [...lireMedias(existant.medias), ...nouveaux] },
  });

  return { ok: true, data: album };
}

/**
 * Supprime un média d'un album (@EF24) : fichier S3 (best-effort) + entrée `medias`.
 */
export async function supprimerMedia(albumId: number, mediaId: string): Promise<ResultatAlbum> {
  const existant = await prisma.album.findUnique({ where: { id: albumId }, select: { id: true, medias: true } });
  if (!existant) {
    return { ok: false, code: "INTROUVABLE", message: "Album introuvable." };
  }

  const medias = lireMedias(existant.medias);
  const media = medias.find((m) => m.id === mediaId);
  if (!media) {
    return { ok: false, code: "MEDIA_INTROUVABLE", message: "Média introuvable dans cet album." };
  }

  try {
    await deleteFile(media.key);
  } catch (err) {
    console.error(`[S3] Échec suppression ${media.key} :`, err);
  }

  const album = await prisma.album.update({
    where: { id: albumId },
    data: { medias: medias.filter((m) => m.id !== mediaId) },
  });

  return { ok: true, data: album };
}
