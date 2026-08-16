// Contrôleur d'authentification — BFA Bille Football Academy
// `login`  : @EF46 (succès), @EF47 (erreur identifiants), mise à jour `derniereConnexion`.
// `logout` : @EF49 (stateless — suppression du token côté client).
//
// Le client Prisma réutilise le singleton centralisé dans `src/config/database.ts`.

import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import prisma from "../config/database";
import { signToken } from "../services/jwtService";
import { isValidEmail, isValidPassword } from "../utils/validators";

/**
 * Connexion de l'administrateur.
 * Body attendu : `{ email, motDePasse }`.
 * 200 → `{ success, token, user }` · 400 → validation · 401 → identifiants incorrects.
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, motDePasse } = (req.body ?? {}) as {
    email?: unknown;
    motDePasse?: unknown;
  };

  if (!isValidEmail(email) || !isValidPassword(motDePasse)) {
    res.status(400).json({ success: false, message: "Données de connexion invalides" });
    return;
  }

  const admin = await prisma.administrateur.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  // Même réponse que l'admin existe ou non : évite l'énumération de comptes.
  const motDePasseValide = admin ? await bcrypt.compare(motDePasse, admin.motDePasse) : false;

  if (!admin || !motDePasseValide) {
    res.status(401).json({ success: false, message: "Identifiants incorrects" });
    return;
  }

  await prisma.administrateur.update({
    where: { id: admin.id },
    data: { derniereConnexion: new Date() },
  });

  const token = signToken({ id: admin.id, email: admin.email, role: admin.role });

  res.json({
    success: true,
    token,
    user: { id: admin.id, nom: admin.nom, email: admin.email, role: admin.role },
  });
}

/**
 * Déconnexion — stateless : le backend n'a rien à révoquer.
 * La suppression du token est gérée côté client (localStorage / cookie).
 */
export function logout(_req: Request, res: Response): void {
  res.json({ success: true });
}
