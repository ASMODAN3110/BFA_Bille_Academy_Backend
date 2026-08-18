// Contrôleur du back-office — BFA Bille Football Academy (Module 9)
// Endpoints protégés `/admin/*` (la protection `authenticate` est
// appliquée au montage dans `src/app.ts`). Chaque méthode délègue au
// service et renvoie l'enveloppe { success, data }.
// Express 5 : les rejets async arrivent seuls au middleware d'erreur (500).
//
// Module 10 — Gestion des utilisateurs :
//   GET  /admin/users               → liste des administrateurs
//   POST /admin/users               → création (201)
//   PUT  /admin/users/:id           → modification nom/email/rôle
//   PUT  /admin/users/:id/password  → réinitialisation d'un mot de passe
//   PUT  /admin/profile/password    → changement de son propre mot de passe

import type { Request, Response } from "express";
import {
  changerMotDePasse,
  creerAdmin,
  getDashboardStats,
  getRecentActivity,
  getRecentArticles,
  getRecentTrials,
  getStatsBlog,
  getStatsEvents,
  getStatsPlayers,
  getStatsShop,
  getStatsTrials,
  getUpcomingEvents,
  listerAdmins,
  modifierAdmin,
  reinitialiserMotDePasse,
} from "../services/adminService";
import {
  isValidEmail,
  isValidNewPassword,
  isValidNom,
} from "../utils/validators";

/** GET /admin/dashboard — récapitulatif global (@EF50). */
export async function getDashboard(_req: Request, res: Response): Promise<void> {
  const { data } = await getDashboardStats();
  res.json({ success: true, data });
}

/** GET /admin/stats/players — effectifs par catégorie. */
export async function getPlayersStats(_req: Request, res: Response): Promise<void> {
  const { data } = await getStatsPlayers();
  res.json({ success: true, data });
}

/** GET /admin/stats/trials — demandes d'essai par statut. */
export async function getTrialsStats(_req: Request, res: Response): Promise<void> {
  const { data } = await getStatsTrials();
  res.json({ success: true, data });
}

/** GET /admin/stats/events — événements à venir / passés. */
export async function getEventsStats(_req: Request, res: Response): Promise<void> {
  const { data } = await getStatsEvents();
  res.json({ success: true, data });
}

/** GET /admin/stats/blog — articles publiés / brouillons. */
export async function getBlogStats(_req: Request, res: Response): Promise<void> {
  const { data } = await getStatsBlog();
  res.json({ success: true, data });
}

/** GET /admin/stats/shop — produits en stock / rupture. */
export async function getShopStats(_req: Request, res: Response): Promise<void> {
  const { data } = await getStatsShop();
  res.json({ success: true, data });
}

/** GET /admin/recent/trials — 5 dernières demandes d'essai. */
export async function getRecentTrialsController(_req: Request, res: Response): Promise<void> {
  const { data } = await getRecentTrials();
  res.json({ success: true, data });
}

/** GET /admin/recent/activity — timeline d'activité récente. */
export async function getRecentActivityController(_req: Request, res: Response): Promise<void> {
  const { data } = await getRecentActivity();
  res.json({ success: true, data });
}

/** GET /admin/recent/articles — 5 derniers articles publiés (pour /dashboard). */
export async function getRecentArticlesController(_req: Request, res: Response): Promise<void> {
  const { data } = await getRecentArticles();
  res.json({ success: true, data });
}

/** GET /admin/recent/events — 5 prochains événements (pour /dashboard). */
export async function getUpcomingEventsController(_req: Request, res: Response): Promise<void> {
  const { data } = await getUpcomingEvents();
  res.json({ success: true, data });
}

/* ------------------------------------------------------------------ */
/* Gestion des utilisateurs (Module 10)                                */
/* ------------------------------------------------------------------ */

/** Convertit un paramètre d'URL en entier positif ; renvoie 0 si invalide. */
function parseId(value: string | string[]): number {
  const v = Array.isArray(value) ? value[0] : value;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/** Statut HTTP associé au code d'erreur métier du service (défaut : 400). */
function statutPourCodeAdmin(code?: string): number {
  switch (code) {
    case "ADMIN_INTROUVABLE":
      return 404;
    case "EMAIL_EXISTE":
      return 409;
    default:
      return 400;
  }
}

/** GET /admin/users — Liste tous les administrateurs (sans mot de passe). */
export async function getUsers(_req: Request, res: Response): Promise<void> {
  const resultat = await listerAdmins();
  res.json({ success: true, data: resultat.data });
}

/** POST /admin/users — Création d'un administrateur (nom, email, mot de passe, rôle optionnel) → 201. */
export async function createUser(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const nom = typeof body.nom === "string" ? body.nom.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const motDePasse = typeof body.motDePasse === "string" ? body.motDePasse : "";

  if (!isValidNom(nom)) {
    res.status(400).json({ success: false, message: "Le nom est requis." });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ success: false, message: "L'e-mail est invalide." });
    return;
  }
  if (!isValidNewPassword(motDePasse)) {
    res.status(400).json({ success: false, message: "Le mot de passe doit contenir au moins 6 caractères." });
    return;
  }

  const resultat = await creerAdmin({ nom, email, motDePasse, role: body.role });
  if (!resultat.ok) {
    res.status(statutPourCodeAdmin(resultat.code)).json({ success: false, message: resultat.message });
    return;
  }
  res.status(201).json({ success: true, data: resultat.data });
}

/** PUT /admin/users/:id — Modifie nom, email et/ou rôle d'un administrateur. */
export async function updateUser(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant d'administrateur invalide" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const resultat = await modifierAdmin(id, {
    nom: body.nom,
    email: body.email,
    role: body.role,
  });
  if (!resultat.ok) {
    res.status(statutPourCodeAdmin(resultat.code)).json({ success: false, message: resultat.message });
    return;
  }
  res.json({ success: true, data: resultat.data });
}

/** PUT /admin/users/:id/password — Réinitialise le mot de passe d'un autre administrateur. */
export async function resetUserPassword(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Identifiant d'administrateur invalide" });
    return;
  }

  const nouveauMotDePasse = typeof req.body?.nouveauMotDePasse === "string" ? req.body.nouveauMotDePasse : "";
  if (!isValidNewPassword(nouveauMotDePasse)) {
    res.status(400).json({ success: false, message: "Le mot de passe doit contenir au moins 6 caractères." });
    return;
  }

  const resultat = await reinitialiserMotDePasse(id, nouveauMotDePasse);
  if (!resultat.ok) {
    res.status(statutPourCodeAdmin(resultat.code)).json({ success: false, message: resultat.message });
    return;
  }
  res.json({ success: true, message: resultat.message });
}

/** PUT /admin/profile/password — Change son propre mot de passe (vérifie l'actuel). */
export async function updateProfilePassword(req: Request, res: Response): Promise<void> {
  const id = req.user?.id;
  if (!id) {
    res.status(401).json({ success: false, message: "Authentification requise." });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const motDePasseActuel = typeof body.motDePasseActuel === "string" ? body.motDePasseActuel : "";
  const nouveauMotDePasse = typeof body.nouveauMotDePasse === "string" ? body.nouveauMotDePasse : "";

  if (motDePasseActuel.length === 0) {
    res.status(400).json({ success: false, message: "Le mot de passe actuel est requis." });
    return;
  }
  if (!isValidNewPassword(nouveauMotDePasse)) {
    res.status(400).json({ success: false, message: "Le nouveau mot de passe doit contenir au moins 6 caractères." });
    return;
  }

  const resultat = await changerMotDePasse(id, { motDePasseActuel, nouveauMotDePasse });
  if (!resultat.ok) {
    res.status(statutPourCodeAdmin(resultat.code)).json({ success: false, message: resultat.message });
    return;
  }
  res.json({ success: true, message: resultat.message });
}
