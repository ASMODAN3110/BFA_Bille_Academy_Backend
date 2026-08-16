// Script de seed — BFA Bille Football Academy
// Exécuté via `npm run db:seed` (= `prisma db seed` = `tsx prisma/seed.ts`).
// Idempotent : supprime puis recrée les données de démonstration.
//
// Prérequis : PostgreSQL accessible via DATABASE_URL (cf. .env) et
// migrations appliquées (`npm run db:migrate`).

import "dotenv/config";
import bcrypt from "bcryptjs";
// Client + connexion (driver adapter `@prisma/adapter-pg`) centralisés dans src/config/database.ts
import prisma from "../src/config/database";

// ---------------------------------------------------------------------
// Helpers de dates
// ---------------------------------------------------------------------

/** Date dans `days` jours par rapport à aujourd'hui (pour les dates futures/passées). */
const daysFromNow = (days: number): Date => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

/** Date de naissance correspondant à un âge donné (15 janvier de l'année N - âge). */
const birthDate = (age: number): Date => new Date(new Date().getFullYear() - age, 0, 15);

// ---------------------------------------------------------------------
// Nettoyage (ordre inverse des dépendances) + données de démonstration
// ---------------------------------------------------------------------

async function main() {
  console.log("→ Nettoyage des données existantes…");

  // Ordre inverse des dépendances pour respecter les contraintes de clés étrangères.
  await prisma.devis.deleteMany();
  await prisma.produit.deleteMany();
  await prisma.classement.deleteMany();
  await prisma.resultat.deleteMany();
  await prisma.article.deleteMany();
  await prisma.ficheTechnique.deleteMany();
  await prisma.album.deleteMany();
  await prisma.demandeEssai.deleteMany();
  await prisma.evenement.deleteMany();
  await prisma.joueur.deleteMany();
  await prisma.categorie.deleteMany();
  await prisma.administrateur.deleteMany();

  console.log("→ Création des données de démonstration…");

  // ---- Module 9 : Administrateur (mot de passe hashé) ----
  const admin = await prisma.administrateur.upsert({
    where: { email: "admin@bfa-academy.com" },
    update: {},
    create: {
      nom: "Administrateur BFA",
      email: "admin@bfa-academy.com",
      motDePasse: bcrypt.hashSync("BFA@2026!", 10),
      role: "SUPER_ADMIN",
    },
  });
  console.log("  ✔ Administrateur créé");

  // ---- Module 1 : Catégories ----
  const categoriesData = [
    { nom: "U9", ageMin: 9, ageMax: 10 },
    { nom: "U15", ageMin: 13, ageMax: 15 },
    { nom: "U17", ageMin: 16, ageMax: 17 },
  ];

  const categories: Record<string, { id: number }> = {};
  for (const c of categoriesData) {
    categories[c.nom] = await prisma.categorie.create({ data: c });
  }
  console.log("  ✔ Catégories créées :", Object.keys(categories).join(", "));

  // ---- Module 1 : Joueurs (3 par catégorie, âges dans la tranche 9-17) ----
  const joueursData: { nom: string; prenom: string; age: number; poste: string; categorie: string }[] = [
    // U9
    { nom: "Mbeze", prenom: "Jean", age: 9, poste: "Gardien", categorie: "U9" },
    { nom: "Etoa", prenom: "Lucas", age: 10, poste: "Défenseur", categorie: "U9" },
    { nom: "Owona", prenom: "Enzo", age: 9, poste: "Milieu", categorie: "U9" },
    // U15
    { nom: "Mbarga", prenom: "Kylian", age: 14, poste: "Attaquant", categorie: "U15" },
    { nom: "Nkoulou", prenom: "Samuel", age: 15, poste: "Milieu", categorie: "U15" },
    { nom: "Tchouamé", prenom: "David", age: 13, poste: "Défenseur", categorie: "U15" },
    // U17
    { nom: "Bikay", prenom: "Landry", age: 17, poste: "Gardien", categorie: "U17" },
    { nom: "Ndongo", prenom: "Josué", age: 16, poste: "Milieu", categorie: "U17" },
    { nom: "Eloundou", prenom: "Cédric", age: 16, poste: "Attaquant", categorie: "U17" },
  ];

  for (const j of joueursData) {
    await prisma.joueur.create({
      data: {
        nom: j.nom,
        prenom: j.prenom,
        dateNaissance: birthDate(j.age),
        poste: j.poste,
        dateArrivee: daysFromNow(-90),
        categorieId: categories[j.categorie].id,
        administrateurId: admin.id,
      },
    });
  }
  console.log(`  ✔ ${joueursData.length} joueurs créés (3 par catégorie)`);

  // ---- Module 2 : Événements (2 matchs + 1 entraînement, catégorie U15) ----
  const u15 = categories["U15"].id;
  await prisma.evenement.create({
    data: {
      titre: "BFA U15 vs Olympique de Douala",
      date: daysFromNow(5),
      heure: "15:30",
      lieu: "Stade de la Bille",
      type: "MATCH",
      equipeA: "BFA U15",
      equipeB: "Olympique de Douala",
      scoreA: null,
      scoreB: null,
      typeMatch: "CHAMPIONNAT",
      categorieId: u15,
      administrateurId: admin.id,
    },
  });

  await prisma.evenement.create({
    data: {
      titre: "BFA U15 vs Canon Yaoundé",
      date: daysFromNow(12),
      heure: "16:00",
      lieu: "Stade de la Bille",
      type: "MATCH",
      equipeA: "BFA U15",
      equipeB: "Canon Yaoundé",
      scoreA: null,
      scoreB: null,
      typeMatch: "AMICAL",
      categorieId: u15,
      administrateurId: admin.id,
    },
  });

  await prisma.evenement.create({
    data: {
      titre: "Entraînement tactique",
      date: daysFromNow(3),
      heure: "17:00",
      lieu: "Terrain annexe",
      type: "ENTRAINEMENT",
      objectif: "Travail du pressing et de la relance courte",
      duree: 90,
      categorieId: u15,
      administrateurId: admin.id,
    },
  });
  console.log("  ✔ 3 événements créés (2 matchs + 1 entraînement)");

  // ---- Module 3 : Demande d'essai ----
  await prisma.demandeEssai.create({
    data: {
      nomJoueur: "Abdoul",
      prenomJoueur: "Mohamed",
      age: 14,
      telephone: "+237 690 000 000",
      email: "mohamed.abdoul@example.com",
      dateEssai: daysFromNow(10),
      message: "Milieu de terrain, actuellement en U14 dans son club de quartier.",
      statut: "EN_ATTENTE",
      administrateurId: admin.id,
    },
  });
  console.log("  ✔ 1 demande d'essai créée");

  // ---- Module 4 : Albums ----
  await prisma.album.create({
    data: {
      titre: "Saison 2025-2026",
      description: "Photos de la rentrée de la saison",
      theme: "MATCH",
      medias: [
        "/images/albums/saison-2025-2026/photo1.jpg",
        "/images/albums/saison-2025-2026/photo2.jpg",
        "/images/albums/saison-2025-2026/photo3.jpg",
      ],
      administrateurId: admin.id,
    },
  });

  await prisma.album.create({
    data: {
      titre: "Stage de mi-saison",
      description: "Photos et vidéos du stage de préparation",
      theme: "STAGE",
      medias: ["/images/albums/stage/photo1.jpg", "/images/albums/stage/video1.mp4"],
      administrateurId: admin.id,
    },
  });
  console.log("  ✔ 2 albums créés");

  // ---- Module 5 : Fiches techniques (une par catégorie) ----
  const fichesData = [
    {
      nom: "U9",
      staff: "Entraîneur : Paul Biya\nAdjoint : Marc Essomba\nPréparateur : Serge Mbida",
      palmares: "Champion du tournoi jeunes de la ville 2025",
      objectifs: "Développement des fondamentaux techniques\nInitiation au jeu collectif",
      saison: "2025-2026",
    },
    {
      nom: "U15",
      staff: "Entraîneur : Alain Ngassa\nAdjoint : Eric Mvondo",
      palmares: "Finaliste régional 2025\nVainqueur de la coupe de district 2024",
      objectifs: "Préparation au football de compétition\nDétection pour la sélection nationale",
      saison: "2025-2026",
    },
    {
      nom: "U17",
      staff: "Entraîneur : Roger Mille\nAnalyste vidéo : Anne Ebongue",
      palmares: "Champion régional 2025\nDemi-finaliste national 2024",
      objectifs: "Passage vers le football professionnel\nDétection pro",
      saison: "2025-2026",
    },
  ];

  for (const f of fichesData) {
    await prisma.ficheTechnique.create({
      data: {
        staff: f.staff,
        palmares: f.palmares,
        objectifs: f.objectifs,
        saison: f.saison,
        categorieId: categories[f.nom].id,
        modifieParId: admin.id,
      },
    });
  }
  console.log("  ✔ 3 fiches techniques créées");

  // ---- Module 6 : Articles ----
  await prisma.article.create({
    data: {
      titre: "Victoire de la BFA U15 en championnat",
      contenu:
        "Les U15 de la BFA Bille Football Academy se sont imposés 3-1 face à l'Olympique de Douala " +
        "dans un match maîtrisé. Un doublé de Kylian Mbarga et un but de Samuel Nkoulou ont permis " +
        "de prendre les trois points du championnat.",
      categorie: "MATCHS",
      auteur: "Communication BFA",
      estPublie: true,
      administrateurId: admin.id,
    },
  });

  await prisma.article.create({
    data: {
      titre: "Portrait de Josué Ndongo, espoir du milieu de terrain",
      contenu:
        "À 16 ans, Josué Ndongo s'impose déjà comme un pilier du milieu de terrain U17. " +
        "Le portrait complet de ce jeune talent qui vise la détection nationale.",
      categorie: "PORTRAITS",
      auteur: "Communication BFA",
      estPublie: false,
      administrateurId: admin.id,
    },
  });
  console.log("  ✔ 2 articles créés");

  // ---- Module 7 : Résultats + Classements (catégorie U15) ----
  await prisma.resultat.create({
    data: {
      equipeA: "BFA U15",
      equipeB: "Olympique de Douala",
      scoreA: 3,
      scoreB: 1,
      date: daysFromNow(-2),
      type: "CHAMPIONNAT",
      categorieId: u15,
      administrateurId: admin.id,
    },
  });

  await prisma.resultat.create({
    data: {
      equipeA: "BFA U15",
      equipeB: "Canon Yaoundé",
      scoreA: 2,
      scoreB: 2,
      date: daysFromNow(-6),
      type: "AMICAL",
      categorieId: u15,
      administrateurId: admin.id,
    },
  });

  // Classements initiaux (recalculables via la couche service `recalculer()`).
  const classementsData = [
    { equipe: "BFA U15", matchsJoues: 2, victoires: 1, nuls: 1, defaites: 0, points: 4 },
    { equipe: "Olympique de Douala", matchsJoues: 2, victoires: 0, nuls: 0, defaites: 2, points: 0 },
    { equipe: "Canon Yaoundé", matchsJoues: 1, victoires: 0, nuls: 1, defaites: 0, points: 1 },
  ];

  for (const cl of classementsData) {
    await prisma.classement.create({ data: { ...cl, categorieId: u15 } });
  }
  console.log("  ✔ 2 résultats et 3 classements créés (U15)");

  // ---- Module 8 : Produits + Devis ----
  const maillot = await prisma.produit.create({
    data: {
      nom: "Maillot domicile BFA U15",
      description: "Maillot officiel de l'académie, tissu respirant, écusson brodé.",
      prix: 25000,
      image: "/images/produits/maillot-domicile.jpg",
      tailles: ["S", "M", "L", "XL"],
      administrateurId: admin.id,
    },
  });

  await prisma.produit.create({
    data: {
      nom: "Écharpe supporters BFA",
      description: "Écharpe aux couleurs de l'académie pour supporter les équipes.",
      prix: 5000,
      image: "/images/produits/echarpe.jpg",
      tailles: ["L"],
      administrateurId: admin.id,
    },
  });

  await prisma.devis.create({
    data: {
      nomComplet: "Marie Abena",
      email: "marie.abena@example.com",
      telephone: "+237 670 000 000",
      quantite: 10,
      taille: "L",
      message: "Pour l'équipe des supporters du quartier.",
      estTraite: false,
      produitId: maillot.id,
      administrateurId: admin.id,
    },
  });

  await prisma.devis.create({
    data: {
      nomComplet: "Paul Simo",
      email: "paul.simo@example.com",
      telephone: "+237 650 000 000",
      quantite: 2,
      taille: "XL",
      message: "Maillots pour mes deux enfants joueurs à l'académie.",
      estTraite: true,
      produitId: maillot.id,
      administrateurId: admin.id,
    },
  });
  console.log("  ✔ 2 produits et 2 devis créés");

  console.log("\n✅ Seed terminé avec succès !");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
