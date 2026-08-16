// Service JWT — BFA Bille Football Academy
// Génération (`signToken`) et vérification (`verifyToken`) des tokens d'authentification.
// Le payload signé contient `{ id, email, role }` de l'administrateur (module 9).
//
// `JWT_SECRET` est obligatoire (contrôlé au démarrage dans `src/index.ts`) ;
// `JWT_EXPIRES_IN` est optionnel (défaut : "7d", formats jsonwebtoken : "7d", "1h", ...).

import jwt, { type SignOptions } from "jsonwebtoken";

/** Contenu du token JWT, aussi injecté dans `req.user` par le middleware `authenticate`. */
export interface AuthTokenPayload {
  id: number;
  email: string;
  role: string;
}

/** Génère un token signé pour l'administrateur. */
export function signToken(payload: AuthTokenPayload): string {
  // `expiresIn` est typé `StringValue | number` (template literal) : la valeur
  // provenant de l'env est un `string` dynamique → cast vers le type attendu.
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, process.env.JWT_SECRET!, options);
}

/**
 * Vérifie la validité d'un token (signature + expiration) et renvoie son payload.
 * Lève `TokenExpiredError` / `JsonWebTokenError` si le token est invalide ou expiré.
 */
export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as AuthTokenPayload;
}
