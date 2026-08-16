// Middleware d'authentification — BFA Bille Football Academy
// Vérifie le token JWT présent dans `Authorization: Bearer <token>` et
// injecte l'administrateur dans `req.user` (voir `src/types/express.d.ts`).
// À appliquer sur toutes les routes `/admin/*` (@EF48).

import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../services/jwtService";

/** Middleware Express de protection des routes admin. */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Token manquant" });
    return;
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    // Token altéré ou expiré → même réponse générique.
    res.status(401).json({ success: false, message: "Token invalide ou expiré" });
  }
}
