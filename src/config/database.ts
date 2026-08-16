// Configuration Prisma — BFA Bille Football Academy
//
// Prisma 7 exige un driver adapter : ici `@prisma/adapter-pg` (driver node-postgres, TCP direct).
// `DATABASE_URL` est une chaîne `postgresql://…` classique, consommée directement par l'adapter.
//
// `getPrismaConnectionString()` renvoie l'URL utilisée par le client runtime :
//  - `DIRECT_DATABASE_URL` en priorité (override utile si DATABASE_URL devait rester
//    au format Prisma Postgres `prisma+postgres://`, non accepté par l'adapter) ;
//  - sinon `DATABASE_URL` telle quelle (format `postgresql://` ou `postgres://`).

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

/** Résout l'URL de connexion `postgres://…` attendue par le driver adapter. */
export function getPrismaConnectionString(): string {
  const direct = process.env.DIRECT_DATABASE_URL;
  if (direct) return direct;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL est manquante dans le fichier .env");
  }
  return url;
}

const adapter = new PrismaPg({ connectionString: getPrismaConnectionString() });

export const prisma = new PrismaClient({
  adapter,
  // `LOG_QUERIES=1` pour tracer les requêtes SQL en développement.
  log: process.env.LOG_QUERIES === "1" ? ["query", "warn", "error"] : ["warn", "error"],
});

export default prisma;
