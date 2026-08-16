// Augmentation des types Express — BFA Bille Football Academy
// Ajoute `req.user` (administrateur authentifié) à l'interface Express.Request.
// Le champ est rempli par le middleware `authenticate` (`src/middlewares/auth.ts`).

import type { AuthTokenPayload } from "../services/jwtService";

declare global {
  namespace Express {
    interface Request {
      /** Administrateur authentifié, extrait du token JWT (optionnel hors routes protégées). */
      user?: AuthTokenPayload;
    }
  }
}

export {};
