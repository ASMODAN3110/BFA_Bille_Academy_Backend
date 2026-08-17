// Configuration S3/MinIO — BFA Bille Football Academy
// Client S3 unique, partagé par le service de stockage et les scripts.
// `forcePathStyle: true` est OBLIGATOIRE pour MinIO : il adresse les objets par
// chemin (`/bucket/key`) et non par virtual-host (`bucket.endpoint`).
//
// Points d'accès :
//   - conteneur backend  : `http://minio:9000` (nom de service docker-compose) ;
//   - scripts sur le host : `http://localhost:9000` (valeur du .env) ;
//   - navigateur         : URLs publiques basées sur `S3_PUBLIC_URL` (port 9000 publié).

import { S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
const region = process.env.S3_REGION ?? "us-east-1";

/** Nom du bucket de médias (créé/validé par `ensureBucket`). */
export const BUCKET = process.env.S3_BUCKET ?? "bfa-media";

/** Base des URLs publiques stockées en base (côté navigateur), sans slash final. */
export const S3_PUBLIC_URL = (process.env.S3_PUBLIC_URL ?? "http://localhost:9000").replace(/\/+$/, "");

export const s3Client = new S3Client({
  endpoint,
  region,
  forcePathStyle: true, // requis pour MinIO (adressage par chemin, pas par virtual-host)
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "minioadmin",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "minioadmin123",
  },
});
