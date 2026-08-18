// Routes protégées du back-office — BFA Bille Football Academy (Module 9)
// GET /admin/dashboard         → récapitulatif global (@EF50)
// GET /admin/stats/players     → effectifs par catégorie
// GET /admin/stats/trials      → demandes d'essai par statut
// GET /admin/stats/events      → événements à venir / passés
// GET /admin/stats/blog        → articles publiés / brouillons
// GET /admin/stats/shop        → produits en stock / rupture
// GET /admin/recent/trials     → 5 dernières demandes d'essai
// GET /admin/recent/activity   → timeline d'activité récente
//
// Module 10 — Gestion des utilisateurs (administrateurs) :
// GET  /admin/users               → liste des administrateurs
// POST /admin/users               → création (201)
// PUT  /admin/users/:id           → modification nom/email/rôle
// PUT  /admin/users/:id/password  → réinitialisation d'un mot de passe
// PUT  /admin/profile/password    → changement de son propre mot de passe
// La protection `authenticate` est appliquée au montage dans `src/app.ts`.

import { Router } from "express";
import {
  createUser,
  getBlogStats,
  getDashboard,
  getEventsStats,
  getPlayersStats,
  getRecentActivityController,
  getRecentArticlesController,
  getRecentTrialsController,
  getShopStats,
  getTrialsStats,
  getUpcomingEventsController,
  getUsers,
  resetUserPassword,
  updateProfilePassword,
  updateUser,
} from "../controllers/adminController";

const router = Router();

router.get("/dashboard", getDashboard);
router.get("/stats/players", getPlayersStats);
router.get("/stats/trials", getTrialsStats);
router.get("/stats/events", getEventsStats);
router.get("/stats/blog", getBlogStats);
router.get("/stats/shop", getShopStats);
router.get("/recent/trials", getRecentTrialsController);
router.get("/recent/activity", getRecentActivityController);
router.get("/recent/articles", getRecentArticlesController);
router.get("/recent/events", getUpcomingEventsController);

// ---- Module 10 : utilisateurs ----
router.get("/users", getUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.put("/users/:id/password", resetUserPassword);
router.put("/profile/password", updateProfilePassword);

export default router;
