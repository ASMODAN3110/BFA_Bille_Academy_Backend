// Routes protégées du back-office — BFA Bille Football Academy
// La protection (`authenticate`) est appliquée au montage dans `src/app.ts`.
// GET /admin/dashboard → récapitulatif des données (@EF50).

import { Router } from "express";
import prisma from "../config/database";

const router = Router();

/** Tableau de bord : compteurs de toutes les tables (module 1 à 9). */
router.get("/dashboard", async (_req, res) => {
  const [administrateur, categorie, joueur, evenement, demandeEssai, album, ficheTechnique,
         article, resultat, classement, produit, devis] = await Promise.all([
    prisma.administrateur.count(),
    prisma.categorie.count(),
    prisma.joueur.count(),
    prisma.evenement.count(),
    prisma.demandeEssai.count(),
    prisma.album.count(),
    prisma.ficheTechnique.count(),
    prisma.article.count(),
    prisma.resultat.count(),
    prisma.classement.count(),
    prisma.produit.count(),
    prisma.devis.count(),
  ]);

  res.json({
    success: true,
    data: {
      administrateur,
      categorie,
      joueur,
      evenement,
      demandeEssai,
      album,
      ficheTechnique,
      article,
      resultat,
      classement,
      produit,
      devis,
    },
  });
});

export default router;
