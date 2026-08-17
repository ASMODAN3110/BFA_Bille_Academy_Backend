// Service de stockage S3/MinIO — BFA Bille Football Academy
// Encapsule le client S3 (`src/config/s3.ts`) : préparation du bucket, upload,
// suppression, URL publiques et URL pré-signées. Sans dépendance aux contrôleurs.
//
// Le bucket est en lecture PUBLIQUE (les médias sont affichés sur des pages
// publiques) ; l'upload, lui, reste réservé à l'admin via les routes `/admin/media`.
// Les contrôleurs d'entités (joueurs, albums, articles, produits) ne manipulent
// que des chaînes : ils stockent l'URL publique renvoyée ici.

import { randomUUID } from "node:crypto";
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutBucketPolicyCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BUCKET, s3Client, S3_PUBLIC_URL } from "../config/s3";

/** Dossiers autorisés — ils deviennent le préfixe de la clé (et le tri de la galerie). */
export const ALLOWED_DOSSIERS = ["joueurs", "galerie", "blog", "boutique"] as const;
export type Dossier = (typeof ALLOWED_DOSSIERS)[number];

/** Extension de fichier à partir du mimetype (types identiques à ceux validés en upload). */
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

/**
 * URL publique (lecture) d'une clé — la valeur stockée en base par les contrôleurs d'entités.
 * MinIO est adressé en path-style : l'URL inclut le nom du bucket (`S3_PUBLIC_URL/bfa-media/<key>`).
 * `S3_PUBLIC_URL` ne contient donc que l'origine (schéma + hôte + port), sans le bucket.
 */
export function getFileUrl(key: string): string {
  return `${S3_PUBLIC_URL}/${BUCKET}/${key}`;
}

// Promesse mise en cache : le bucket n'est vérifié/créé qu'une fois par process.
let bucketPromise: Promise<void> | null = null;

/**
 * Garantit que le bucket existe (création + policy public-read sinon). Idempotent.
 * La promesse est mise en cache ; en cas d'échec (MinIO indisponible, ...) le cache
 * est remis à zéro pour permettre une nouvelle tentative ultérieure.
 */
export function ensureBucket(): Promise<void> {
  if (!bucketPromise) {
    bucketPromise = creerBucketSiAbsent().catch((err: unknown) => {
      bucketPromise = null;
      throw err;
    });
  }
  return bucketPromise;
}

async function creerBucketSiAbsent(): Promise<void> {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET }));
    return; // bucket déjà présent
  } catch (err) {
    // HeadBucket échoue en 404 si le bucket n'existe pas ; toute autre erreur
    // (MinIO injoignable, ...) remonte et sera loggée par l'appelant.
    const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status !== 404) throw err;
  }

  await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET }));

  // Policy public-read : lecture pour tous (médias sur pages publiques),
  // écriture réservée à l'admin (les routes `/admin/media` sont protégées).
  const policy = JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: "*",
        Action: "s3:GetObject",
        Resource: `arn:aws:s3:::${BUCKET}/*`,
      },
    ],
  });
  await s3Client.send(new PutBucketPolicyCommand({ Bucket: BUCKET, Policy: policy }));
}

export interface FichierUpload {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

export interface MediaStocke {
  key: string;
  url: string;
}

/** Upload un fichier (en mémoire) vers MinIO, dans un dossier autorisé. */
export async function uploadFile({
  dossier,
  fichier,
}: {
  dossier: Dossier;
  fichier: FichierUpload;
}): Promise<MediaStocke> {
  const extension = MIME_EXTENSIONS[fichier.mimetype];
  if (!extension) {
    // Normalement inatteignable : le middleware d'upload filtre déjà les mimetypes.
    throw new Error(`Type de fichier non supporté : ${fichier.mimetype}`);
  }

  const key = `${dossier}/${randomUUID()}${extension}`;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: fichier.buffer,
      ContentType: fichier.mimetype,
      ContentLength: fichier.buffer.length,
    }),
  );
  return { key, url: getFileUrl(key) };
}

/** Upload multiple (albums) — conserve l'ordre des fichiers reçus. */
export async function uploadMany({
  dossier,
  fichiers,
}: {
  dossier: Dossier;
  fichiers: FichierUpload[];
}): Promise<MediaStocke[]> {
  return Promise.all(fichiers.map((fichier) => uploadFile({ dossier, fichier })));
}

/** Supprime un objet. Idempotent : une clé absente de MinIO est un succès. */
export async function deleteFile(key: string): Promise<void> {
  await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export interface FichierListe {
  key: string;
  size: number;
  lastModified: Date;
}

/** Liste les objets du bucket (optionnellement filtrés par préfixe de dossier). */
export async function listFiles(prefix?: string): Promise<FichierListe[]> {
  const result = await s3Client.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix }));
  return (result.Contents ?? []).map((obj) => ({
    key: obj.Key ?? "",
    size: obj.Size ?? 0,
    lastModified: obj.LastModified ?? new Date(0),
  }));
}

/**
 * URL pré-signée (lecture temporaire) — réservée à de futurs contenus privés.
 * Non câblée : les médias actuels sont publics, l'URL stockée suffit.
 */
export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(s3Client, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn });
}
