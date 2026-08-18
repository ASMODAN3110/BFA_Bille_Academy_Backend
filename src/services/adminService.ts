// Service du tableau de bord — BFA Bille Football Academy (Module 9)
// Agrégations Prisma (Promise.all) des statistiques globales et des
// éléments récents. Convention service : renvoie { ok, data }, ne lève
// jamais d'erreur HTTP (le statut est décidé par le contrôleur).
// Note : aucun journal d'audit en base — `vues`/`commentaires` n'ont pas
// de colonne et sont renvoyés à 0 ; la timeline est synthétisée.
//
// Module 10 — Gestion des utilisateurs (administrateurs) :
//   listerAdmins / creerAdmin / modifierAdmin / reinitialiserMotDePasse / changerMotDePasse

import bcrypt from "bcryptjs";
import prisma from "../config/database";
import type { Administrateur } from "../../generated/prisma/client";

/* ------------------------------------------------------------------ */
/* Statistiques par module                                            */
/* ------------------------------------------------------------------ */

/** Statistiques joueurs : total + répartition par catégorie d'âge. */
export async function getStatsPlayers() {
  const [total, categories, repartition] = await Promise.all([
    prisma.joueur.count(),
    prisma.categorie.findMany({ select: { id: true, nom: true } }),
    prisma.joueur.groupBy({ by: ["categorieId"], _count: { _all: true } }),
  ]);

  const byCategory = repartition
    .map((ligne) => {
      const cat = categories.find((c) => c.id === ligne.categorieId);
      return {
        categorie: cat?.nom ?? "—",
        categorieId: ligne.categorieId,
        count: ligne._count._all,
      };
    })
    .sort((a, b) => a.categorie.localeCompare(b.categorie));

  return { ok: true, data: { total, byCategory } };
}

/** Statistiques demandes d'essai par statut (enum StatutDemande). */
export async function getStatsTrials() {
  const [total, pending, confirmed, refused] = await Promise.all([
    prisma.demandeEssai.count(),
    prisma.demandeEssai.count({ where: { statut: "EN_ATTENTE" } }),
    prisma.demandeEssai.count({ where: { statut: "CONFIRME" } }),
    prisma.demandeEssai.count({ where: { statut: "REFUSE" } }),
  ]);

  return { ok: true, data: { total, pending, confirmed, refused } };
}

/** Statistiques événements : total, à venir (date ≥ maintenant), passés. */
export async function getStatsEvents() {
  const maintenant = new Date();
  const [total, upcoming, past] = await Promise.all([
    prisma.evenement.count(),
    prisma.evenement.count({ where: { date: { gte: maintenant } } }),
    prisma.evenement.count({ where: { date: { lt: maintenant } } }),
  ]);

  return { ok: true, data: { total, upcoming, past } };
}

/** Statistiques blog : publiés / brouillons (vues et commentaires = 0). */
export async function getStatsBlog() {
  const [total, published] = await Promise.all([
    prisma.article.count(),
    prisma.article.count({ where: { estPublie: true } }),
  ]);

  return {
    ok: true,
    data: { total, published, drafts: total - published, views: 0, comments: 0 },
  };
}

/** Statistiques boutique : stock disponible / rupture. */
export async function getStatsShop() {
  const [total, inStock, outOfStock] = await Promise.all([
    prisma.produit.count(),
    prisma.produit.count({ where: { stock: { gt: 0 } } }),
    prisma.produit.count({ where: { stock: 0 } }),
  ]);

  return { ok: true, data: { total, inStock, outOfStock } };
}

/* ------------------------------------------------------------------ */
/* Éléments récents                                                   */
/* ------------------------------------------------------------------ */

/** 5 dernières demandes d'essai (tri dateSoumission desc). */
export async function getRecentTrials() {
  const items = await prisma.demandeEssai.findMany({
    orderBy: { dateSoumission: "desc" },
    take: 5,
  });

  return { ok: true, data: { items } };
}

/** 5 derniers articles publiés (tri datePublication desc). */
export async function getRecentArticles() {
  const items = await prisma.article.findMany({
    where: { estPublie: true },
    orderBy: { datePublication: "desc" },
    take: 5,
    select: {
      id: true,
      titre: true,
      categorie: true,
      auteur: true,
      datePublication: true,
    },
  });

  return { ok: true, data: { items } };
}

/** 5 prochains événements (date ≥ maintenant, tri asc). */
export async function getUpcomingEvents() {
  const items = await prisma.evenement.findMany({
    where: { date: { gte: new Date() } },
    orderBy: { date: "asc" },
    take: 5,
    select: {
      id: true,
      titre: true,
      date: true,
      heure: true,
      lieu: true,
      type: true,
      categorieId: true,
      categorie: { select: { nom: true } },
    },
  });

  return { ok: true, data: { items } };
}

/** Timeline d'activité récente (tous modules) — 10 éléments max.
 * Pas de journal d'audit en base : on synthétise la timeline à partir
 * des dates de création de chaque module (3 derniers éléments chacun). */
export async function getRecentActivity() {
  const limite = 3;

  const [joueurs, evenements, demandesEssai, articles, albums, resultats, produits, devis] =
    await Promise.all([
      prisma.joueur.findMany({
        orderBy: { dateArrivee: "desc" },
        take: limite,
        select: { id: true, nom: true, prenom: true, dateArrivee: true },
      }),
      prisma.evenement.findMany({
        orderBy: { date: "desc" },
        take: limite,
        select: { id: true, titre: true, date: true },
      }),
      prisma.demandeEssai.findMany({
        orderBy: { dateSoumission: "desc" },
        take: limite,
        select: { id: true, prenomJoueur: true, nomJoueur: true, dateSoumission: true },
      }),
      prisma.article.findMany({
        orderBy: { datePublication: "desc" },
        take: limite,
        select: { id: true, titre: true, datePublication: true },
      }),
      prisma.album.findMany({
        orderBy: { dateCreation: "desc" },
        take: limite,
        select: { id: true, titre: true, dateCreation: true },
      }),
      prisma.resultat.findMany({
        orderBy: { date: "desc" },
        take: limite,
        select: { id: true, equipeA: true, equipeB: true, date: true },
      }),
      prisma.produit.findMany({
        orderBy: { createdAt: "desc" },
        take: limite,
        select: { id: true, nom: true, createdAt: true },
      }),
      prisma.devis.findMany({
        orderBy: { dateDemande: "desc" },
        take: limite,
        select: { id: true, nomComplet: true, dateDemande: true },
      }),
    ]);

  const evenementsNormalises = [
    ...joueurs.map((e) => ({
      type: "joueur",
      id: e.id,
      titre: `${e.prenom} ${e.nom}`,
      date: e.dateArrivee,
    })),
    ...evenements.map((e) => ({ type: "evenement", id: e.id, titre: e.titre, date: e.date })),
    ...demandesEssai.map((e) => ({
      type: "demande_essai",
      id: e.id,
      titre: `${e.prenomJoueur} ${e.nomJoueur}`,
      date: e.dateSoumission,
    })),
    ...articles.map((e) => ({ type: "article", id: e.id, titre: e.titre, date: e.datePublication })),
    ...albums.map((e) => ({ type: "album", id: e.id, titre: e.titre, date: e.dateCreation })),
    ...resultats.map((e) => ({
      type: "resultat",
      id: e.id,
      titre: `${e.equipeA} – ${e.equipeB}`,
      date: e.date,
    })),
    ...produits.map((e) => ({ type: "produit", id: e.id, titre: e.nom, date: e.createdAt })),
    ...devis.map((e) => ({ type: "devis", id: e.id, titre: e.nomComplet, date: e.dateDemande })),
  ];

  const items = evenementsNormalises
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);

  return { ok: true, data: { items } };
}

/* ------------------------------------------------------------------ */
/* Tableau de bord global                                             */
/* ------------------------------------------------------------------ */

/** Récapitulatif global (@EF50) — agrège tous les sous-totaux + récents. */
export async function getDashboardStats() {
  const [joueurs, articles, demandesEssai, evenements, produits, recentTrials, recentArticles, upcomingEvents] =
    await Promise.all([
      getStatsPlayers(),
      getStatsBlog(),
      getStatsTrials(),
      getStatsEvents(),
      getStatsShop(),
      getRecentTrials(),
      getRecentArticles(),
      getUpcomingEvents(),
    ]);

  return {
    ok: true,
    data: {
      players: joueurs.data,
      articles: articles.data,
      trials: demandesEssai.data,
      events: evenements.data,
      products: produits.data,
      recentTrials: recentTrials.data.items,
      recentArticles: recentArticles.data.items,
      upcomingEvents: upcomingEvents.data.items,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Gestion des utilisateurs (Module 10)                                */
/* ------------------------------------------------------------------ */

/** Rôles autorisés lors de la création / modification d'un administrateur. */
const ROLES_VALIDES = ["ADMIN", "SUPER_ADMIN"];

/** Codes d'erreur métier de la gestion des utilisateurs. */
type CodeErreurAdmin = "ADMIN_INTROUVABLE" | "EMAIL_EXISTE" | "MOT_DE_PASSE_INCORRECT";

/** Administrateur tel que renvoyé par l'API — sans jamais le mot de passe. */
export type AdministrateurPublique = Omit<Administrateur, "motDePasse">;

export interface AdminOperation {
  ok: boolean;
  data?: AdministrateurPublique | AdministrateurPublique[] | null;
  message?: string;
  code?: CodeErreurAdmin;
}

/** Projette un administrateur sans son mot de passe (jamais renvoyé à l'API). */
function sansMotDePasse(admin: Administrateur): AdministrateurPublique {
  const { motDePasse: _motDePasse, ...publique } = admin;
  return publique;
}

/** Valide et normalise le rôle (défaut : "ADMIN"). */
function roleNormalise(role: unknown): string {
  return typeof role === "string" && ROLES_VALIDES.includes(role) ? role : "ADMIN";
}

/** GET — Liste tous les administrateurs (sans mot de passe). */
export async function listerAdmins(): Promise<AdminOperation> {
  const admins = await prisma.administrateur.findMany({
    orderBy: { dateCreation: "desc" },
  });
  return { ok: true, data: admins.map(sansMotDePasse) };
}

/**
 * POST — Crée un nouvel administrateur.
 * Le mot de passe est hashé (bcrypt, coût 10) ; l'email est unique (409 si pris).
 */
export async function creerAdmin(
  donnees: { nom: string; email: string; motDePasse: string; role?: unknown },
): Promise<AdminOperation> {
  const email = donnees.email.trim().toLowerCase();
  const existant = await prisma.administrateur.findUnique({ where: { email } });
  if (existant) {
    return { ok: false, code: "EMAIL_EXISTE", message: "Cet e-mail est déjà utilisé." };
  }

  const admin = await prisma.administrateur.create({
    data: {
      nom: donnees.nom.trim(),
      email,
      motDePasse: bcrypt.hashSync(donnees.motDePasse, 10),
      role: roleNormalise(donnees.role),
    },
  });
  return { ok: true, data: sansMotDePasse(admin) };
}

/** PUT /:id — Modifie nom, email et/ou rôle d'un administrateur existant. */
export async function modifierAdmin(
  id: number,
  donnees: { nom?: unknown; email?: unknown; role?: unknown },
): Promise<AdminOperation> {
  const existant = await prisma.administrateur.findUnique({ where: { id } });
  if (!existant) return { ok: false, code: "ADMIN_INTROUVABLE", message: "Administrateur introuvable." };

  const email = typeof donnees.email === "string" ? donnees.email.trim().toLowerCase() : existant.email;
  if (email !== existant.email) {
    const conflit = await prisma.administrateur.findUnique({ where: { email } });
    if (conflit) return { ok: false, code: "EMAIL_EXISTE", message: "Cet e-mail est déjà utilisé." };
  }

  const admin = await prisma.administrateur.update({
    where: { id },
    data: {
      nom: typeof donnees.nom === "string" ? donnees.nom.trim() : existant.nom,
      email,
      role: roleNormalise(donnees.role ?? existant.role),
    },
  });
  return { ok: true, data: sansMotDePasse(admin) };
}

/** PUT /:id/password — Réinitialise le mot de passe d'un autre administrateur. */
export async function reinitialiserMotDePasse(
  id: number,
  nouveauMotDePasse: string,
): Promise<AdminOperation> {
  const existant = await prisma.administrateur.findUnique({ where: { id } });
  if (!existant) return { ok: false, code: "ADMIN_INTROUVABLE", message: "Administrateur introuvable." };

  await prisma.administrateur.update({
    where: { id },
    data: { motDePasse: bcrypt.hashSync(nouveauMotDePasse, 10) },
  });
  return { ok: true, message: "Mot de passe réinitialisé." };
}

/**
 * PUT /profile/password — Change son propre mot de passe.
 * Le mot de passe actuel est vérifié avant modification (code MOT_DE_PASSE_INCORRECT sinon).
 */
export async function changerMotDePasse(
  id: number,
  donnees: { motDePasseActuel: string; nouveauMotDePasse: string },
): Promise<AdminOperation> {
  const admin = await prisma.administrateur.findUnique({ where: { id } });
  if (!admin) return { ok: false, code: "ADMIN_INTROUVABLE", message: "Administrateur introuvable." };

  const valide = await bcrypt.compare(donnees.motDePasseActuel, admin.motDePasse);
  if (!valide) {
    return { ok: false, code: "MOT_DE_PASSE_INCORRECT", message: "Le mot de passe actuel est incorrect." };
  }

  await prisma.administrateur.update({
    where: { id },
    data: { motDePasse: bcrypt.hashSync(donnees.nouveauMotDePasse, 10) },
  });
  return { ok: true, message: "Mot de passe mis à jour." };
}
