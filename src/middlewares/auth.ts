// Middleware d'authentification — BFA Bille Football Academy
// Vérifie le token JWT présent dans `Authorization: Bearer <token>` et
// injecte l'administrateur dans `req.user` (voir `src/types/express.d.ts`).
// À appliquer sur toutes les routes `/admin/*` (@EF48).
//
// Session périmée : si l'administrateur référencé par le token n'existe plus
// (ex. reseed de la base qui recrée l'admin avec un autre id), on renvoie 401
// au lieu d'un 500 silencieux : le frontend purge alors le token et redirige
// vers le login (géré dans `src/utils/api.js`).

import type { NextFunction, Request, Response } from "express";
import prisma from "../config/database";
import { verifyToken, type AuthTokenPayload } from "../services/jwtService";

/** Middleware Express de protection des routes admin. */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Token manquant" });
    return;
  }

  const token = header.slice("Bearer ".length).trim();

  let payload: AuthTokenPayload;
  try {
    payload = verifyToken(token);
  } catch {
    // Token altéré ou expiré → même réponse générique.
    res.status(401).json({ success: false, message: "Token invalide ou expiré" });
    return;
  }

  // L'administrateur doit encore exister en base (une requête indexée, négligeable).
  const admin = await prisma.administrateur.findUnique({
    where: { id: payload.id },
    select: { id: true },
  });
  if (!admin) {
    res.status(401).json({
      success: false,
      message: "Session expirée, veuillez vous reconnecter.",
    });
    return;
  }

  req.user = payload;
  next();
}
