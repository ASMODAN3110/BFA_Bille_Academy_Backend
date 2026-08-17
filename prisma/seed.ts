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
import type { Prisma } from "../generated/prisma/client";
import { recalculerClassement } from "../src/services/rankingService";

// ---------------------------------------------------------------------
// Helpers de dates
// ---------------------------------------------------------------------

/** Date dans `days` jours par rapport à aujourd'hui (pour les dates futures/passées). */
const daysFromNow = (days: number): Date => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

/**
 * Date dans `days` jours, tronquée à UTC minuit (jour exact, sans heure) :
 * le filtrage mensuel (`month=YYYY-MM`) reste fiable quel que soit le fuseau.
 */
const daysFromNowUtc = (days: number): Date =>
  new Date(daysFromNow(days).toISOString().slice(0, 10) + "T00:00:00.000Z");

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
  // L'administrateur n'est PAS supprimé : le DELETE ne réinitialise pas la
  // séquence auto-increment PostgreSQL → l'admin changerait d'id à chaque
  // reseed, invalidant tous les tokens JWT déjà émis (id périmé → erreur FK).
  // L'upsert ci-dessous préserve l'id et rafraîchit le mot de passe démo.

  console.log("→ Création des données de démonstration…");

  // ---- Module 9 : Administrateur (mot de passe hashé) ----
  const admin = await prisma.administrateur.upsert({
    where: { email: "admin@bfa-academy.com" },
    update: {
      nom: "Administrateur BFA",
      motDePasse: bcrypt.hashSync("BFA@2026!", 10),
      role: "SUPER_ADMIN",
    },
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

  // ---- Module 2 : Événements (≥ 8, toutes catégories, répartis sur plusieurs mois) ----
  const evenementsData: {
    titre: string;
    date: Date;
    heure: string;
    lieu: string;
    type: "MATCH" | "ENTRAINEMENT";
    categorie: string;
    equipeA?: string;
    equipeB?: string;
    typeMatch?: "AMICAL" | "CHAMPIONNAT";
    objectif?: string;
    duree?: number;
  }[] = [
    // U9
    { titre: "Entraînement U9 — conduite de balle", date: daysFromNowUtc(4), heure: "16:30", lieu: "Terrain annexe", type: "ENTRAINEMENT", categorie: "U9", objectif: "Travail de la conduite de balle et du dribble", duree: 60 },
    { titre: "BFA U9 vs Union de Mokolo", date: daysFromNowUtc(8), heure: "10:00", lieu: "Stade de la Bille", type: "MATCH", categorie: "U9", equipeA: "BFA U9", equipeB: "Union de Mokolo", typeMatch: "AMICAL" },
    { titre: "Entraînement U9 — jeu collectif", date: daysFromNowUtc(28), heure: "16:00", lieu: "Terrain annexe", type: "ENTRAINEMENT", categorie: "U9", objectif: "Initiation au jeu collectif", duree: 45 },
    // U15
    { titre: "Entraînement tactique U15", date: daysFromNowUtc(3), heure: "17:00", lieu: "Terrain annexe", type: "ENTRAINEMENT", categorie: "U15", objectif: "Travail du pressing et de la relance courte", duree: 90 },
    { titre: "BFA U15 vs Olympique de Douala", date: daysFromNowUtc(5), heure: "15:30", lieu: "Stade de la Bille", type: "MATCH", categorie: "U15", equipeA: "BFA U15", equipeB: "Olympique de Douala", typeMatch: "CHAMPIONNAT" },
    { titre: "BFA U15 vs Canon Yaoundé", date: daysFromNowUtc(12), heure: "16:00", lieu: "Stade de la Bille", type: "MATCH", categorie: "U15", equipeA: "BFA U15", equipeB: "Canon Yaoundé", typeMatch: "AMICAL" },
    { titre: "BFA U15 vs Coton Sport", date: daysFromNowUtc(35), heure: "15:30", lieu: "Stade de la Bille", type: "MATCH", categorie: "U15", equipeA: "BFA U15", equipeB: "Coton Sport", typeMatch: "CHAMPIONNAT" },
    // U17
    { titre: "Préparation physique U17", date: daysFromNowUtc(10), heure: "18:00", lieu: "Gymnase BFA", type: "ENTRAINEMENT", categorie: "U17", objectif: "Circuit de renforcement musculaire", duree: 75 },
    { titre: "BFA U17 vs Les Astres de Douala", date: daysFromNowUtc(20), heure: "15:00", lieu: "Stade de la Bille", type: "MATCH", categorie: "U17", equipeA: "BFA U17", equipeB: "Les Astres de Douala", typeMatch: "CHAMPIONNAT" },
    { titre: "BFA U17 vs Fortuna Mfou", date: daysFromNowUtc(50), heure: "16:30", lieu: "Stade municipal", type: "MATCH", categorie: "U17", equipeA: "BFA U17", equipeB: "Fortuna Mfou", typeMatch: "AMICAL" },
  ];

  for (const ev of evenementsData) {
    await prisma.evenement.create({
      data: {
        titre: ev.titre,
        date: ev.date,
        heure: ev.heure,
        lieu: ev.lieu,
        type: ev.type,
        equipeA: ev.equipeA ?? null,
        equipeB: ev.equipeB ?? null,
        typeMatch: ev.typeMatch ?? null,
        objectif: ev.objectif ?? null,
        duree: ev.duree ?? null,
        categorieId: categories[ev.categorie].id,
        administrateurId: admin.id,
      },
    });
  }
  console.log(`  ✔ ${evenementsData.length} événements créés (matches + entraînements, toutes catégories)`);

  // ---- Module 3 : Demandes d'essai (statuts variés pour tester le back-office) ----
  const demandesEssai: Prisma.DemandeEssaiUncheckedCreateInput[] = [
    {
      nomJoueur: "Abdoul",
      prenomJoueur: "Mohamed",
      age: 14,
      telephone: "+237 690 000 000",
      email: "mohamed.abdoul@example.com",
      dateEssai: daysFromNow(10),
      message: "Milieu de terrain, actuellement en U14 dans son club de quartier.",
      statut: "EN_ATTENTE",
      administrateurId: null,
      motifRefus: null,
    },
    {
      nomJoueur: "Keïta",
      prenomJoueur: "Ibrahim",
      age: 16,
      telephone: "+237 690 111 111",
      email: "ibrahim.keita@example.com",
      dateEssai: daysFromNow(12),
      message: "Gardien de but, capitaine de son équipe U15.",
      statut: "EN_ATTENTE",
      administrateurId: null,
      motifRefus: null,
    },
    {
      nomJoueur: "Njoya",
      prenomJoueur: "Brice",
      age: 9,
      telephone: "+237 690 222 222",
      email: "brice.njoya@example.com",
      dateEssai: daysFromNow(7),
      message: null,
      statut: "CONFIRME",
      administrateurId: admin.id,
      motifRefus: null,
    },
    {
      nomJoueur: "Etoundi",
      prenomJoueur: "Steve",
      age: 13,
      telephone: "+237 690 333 333",
      email: "steve.etoundi@example.com",
      dateEssai: daysFromNow(5),
      message: "Ailier rapide, souhaite intégrer l'académie pour la saison prochaine.",
      statut: "REFUSE",
      administrateurId: admin.id,
      motifRefus: "Effectif complet de la catégorie pour cette saison.",
    },
    {
      nomJoueur: "Owona",
      prenomJoueur: "Yann",
      age: 17,
      telephone: "+237 690 444 444",
      email: "yann.owona@example.com",
      dateEssai: daysFromNow(3),
      message: "Attaquant, déjà en essai avec un club de D1 camerounaise.",
      statut: "CONFIRME",
      administrateurId: admin.id,
      motifRefus: null,
    },
    {
      nomJoueur: "Tchoua",
      prenomJoueur: "Kévin",
      age: 15,
      telephone: "+237 690 555 555",
      email: "kevin.tchoua@example.com",
      dateEssai: daysFromNow(20),
      message: null,
      statut: "EN_ATTENTE",
      administrateurId: null,
      motifRefus: null,
    },
  ];
  for (const demande of demandesEssai) {
    await prisma.demandeEssai.create({ data: demande });
  }
  console.log(`  ✔ ${demandesEssai.length} demandes d'essai créées (statuts variés)`);

  // ---- Module 4 : Albums (thèmes de la liste fixe @EF21) ----
  const albumsData: Prisma.AlbumUncheckedCreateInput[] = [
    {
      titre: "Entraînements de pré-saison",
      description: "Séances techniques et physiques",
      theme: "Entraînements",
      administrateurId: admin.id,
      medias: [
        { id: "tr1", key: "galerie/pre-saison/conduite.jpg", url: "http://localhost:9000/bfa-media/galerie/pre-saison/conduite.jpg", type: "image", nom: "conduite.jpg" },
        { id: "tr2", key: "galerie/pre-saison/physique.jpg", url: "http://localhost:9000/bfa-media/galerie/pre-saison/physique.jpg", type: "image", nom: "physique.jpg" },
        { id: "tr3", key: "galerie/pre-saison/frappe.mp4", url: "http://localhost:9000/bfa-media/galerie/pre-saison/frappe.mp4", type: "video", nom: "frappe.mp4" },
      ],
    },
    {
      titre: "Matchs de la saison 2025-2026",
      description: "Les belles actions des matchs officiels",
      theme: "Matchs",
      administrateurId: admin.id,
      medias: [
        { id: "mt1", key: "galerie/matchs/ouverture.jpg", url: "http://localhost:9000/bfa-media/galerie/matchs/ouverture.jpg", type: "image", nom: "ouverture.jpg" },
        { id: "mt2", key: "galerie/matchs/but.jpg", url: "http://localhost:9000/bfa-media/galerie/matchs/but.jpg", type: "image", nom: "but.jpg" },
        { id: "mt3", key: "galerie/matchs/celebrations.jpg", url: "http://localhost:9000/bfa-media/galerie/matchs/celebrations.jpg", type: "image", nom: "celebrations.jpg" },
        { id: "mt4", key: "galerie/matchs/resume.mp4", url: "http://localhost:9000/bfa-media/galerie/matchs/resume.mp4", type: "video", nom: "resume.mp4" },
      ],
    },
    {
      titre: "Cérémonie de remise des prix",
      description: "Trophées et récompenses de fin d'année",
      theme: "Événements",
      administrateurId: admin.id,
      medias: [
        { id: "ev1", key: "galerie/evenements/podium.jpg", url: "http://localhost:9000/bfa-media/galerie/evenements/podium.jpg", type: "image", nom: "podium.jpg" },
        { id: "ev2", key: "galerie/evenements/coupe.jpg", url: "http://localhost:9000/bfa-media/galerie/evenements/coupe.jpg", type: "image", nom: "coupe.jpg" },
        { id: "ev3", key: "galerie/evenements/discours.mp4", url: "http://localhost:9000/bfa-media/galerie/evenements/discours.mp4", type: "video", nom: "discours.mp4" },
      ],
    },
    {
      titre: "Portraits des jeunes talents",
      description: "Séances photo des joueurs de l'académie",
      theme: "Portraits",
      administrateurId: admin.id,
      medias: [
        { id: "po1", key: "galerie/portraits/jean.jpg", url: "http://localhost:9000/bfa-media/galerie/portraits/jean.jpg", type: "image", nom: "jean.jpg" },
        { id: "po2", key: "galerie/portraits/lucas.jpg", url: "http://localhost:9000/bfa-media/galerie/portraits/lucas.jpg", type: "image", nom: "lucas.jpg" },
        { id: "po3", key: "galerie/portraits/landry.jpg", url: "http://localhost:9000/bfa-media/galerie/portraits/landry.jpg", type: "image", nom: "landry.jpg" },
        { id: "po4", key: "galerie/portraits/cedric.jpg", url: "http://localhost:9000/bfa-media/galerie/portraits/cedric.jpg", type: "image", nom: "cedric.jpg" },
      ],
    },
  ];
  for (const album of albumsData) {
    await prisma.album.create({ data: album });
  }
  console.log(`  ✔ ${albumsData.length} albums créés (thèmes variés)`);

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
      datePublication: new Date("2026-08-05"),
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
      datePublication: new Date("2026-08-08"),
      administrateurId: admin.id,
    },
  });

  await prisma.article.create({
    data: {
      titre: "La BFA lance sa saison 2026-2027",
      contenu:
        "La BFA Bille Football Academy ouvre officiellement sa saison 2026-2027. Programme des " +
        "entraînements, dates des tournois et objectifs sportifs pour chacune des catégories.",
      categorie: "EVENEMENTS",
      auteur: "Communication BFA",
      estPublie: true,
      datePublication: new Date("2026-08-10"),
      administrateurId: admin.id,
    },
  });

  await prisma.article.create({
    data: {
      titre: "Communiqué : dates des essais U9 à U17",
      contenu:
        "Les essais de la saison 2026-2027 se tiendront au stade BFA. Les familles sont invitées " +
        "à inscrire leurs enfants via le formulaire de demande d'essai du site.",
      categorie: "COMMUNIQUES",
      auteur: "Communication BFA",
      estPublie: true,
      datePublication: new Date("2026-08-12"),
      administrateurId: admin.id,
    },
  });

  await prisma.article.create({
    data: {
      titre: "Bilan du tournoi régional U17",
      contenu:
        "Les U17 terminent à la deuxième place du tournoi régional après une finale disputée. " +
        "Un bilan encourageant et de belles promesses pour la suite de la saison.",
      categorie: "MATCHS",
      auteur: "Communication BFA",
      estPublie: false,
      datePublication: new Date("2026-08-13"),
      administrateurId: admin.id,
    },
  });

  await prisma.article.create({
    data: {
      titre: "Rencontre avec le staff technique",
      contenu:
        "Entretien avec les entraîneurs de la BFA : méthodes de travail, suivi des jeunes " +
        "et ambitions du centre de formation.",
      categorie: "PORTRAITS",
      auteur: "Communication BFA",
      estPublie: true,
      datePublication: new Date("2026-08-15"),
      administrateurId: admin.id,
    },
  });
  console.log("  ✔ 6 articles créés");

  // ---- Module 7 : Résultats + Classements (recalculés via la couche service) ----
  // 8 résultats répartis sur les catégories U9 / U15 / U17 ; le classement n'est
  // PAS saisi à la main : il est recalculé par `recalculerClassement` (règle
  // 3 pts victoire, 1 nul, 0 défaite) — cf. src/services/rankingService.ts.
  const resultatsData: {
    equipeA: string;
    equipeB: string;
    scoreA: number;
    scoreB: number;
    date: Date;
    type: "AMICAL" | "CHAMPIONNAT";
    categorieId: number;
  }[] = [
    { equipeA: "BFA U9", equipeB: "Union de Mokolo", scoreA: 4, scoreB: 2, date: daysFromNow(-3), type: "AMICAL", categorieId: categories["U9"].id },
    { equipeA: "BFA U9", equipeB: "Fortuna Mfou", scoreA: 1, scoreB: 1, date: daysFromNow(-9), type: "AMICAL", categorieId: categories["U9"].id },
    { equipeA: "BFA U15", equipeB: "Olympique de Douala", scoreA: 3, scoreB: 1, date: daysFromNow(-2), type: "CHAMPIONNAT", categorieId: categories["U15"].id },
    { equipeA: "BFA U15", equipeB: "Canon Yaoundé", scoreA: 2, scoreB: 2, date: daysFromNow(-6), type: "AMICAL", categorieId: categories["U15"].id },
    { equipeA: "BFA U15", equipeB: "Coton Sport", scoreA: 0, scoreB: 2, date: daysFromNow(-11), type: "CHAMPIONNAT", categorieId: categories["U15"].id },
    { equipeA: "BFA U17", equipeB: "Les Astres de Douala", scoreA: 2, scoreB: 0, date: daysFromNow(-4), type: "CHAMPIONNAT", categorieId: categories["U17"].id },
    { equipeA: "BFA U17", equipeB: "Fortuna Mfou", scoreA: 3, scoreB: 3, date: daysFromNow(-8), type: "AMICAL", categorieId: categories["U17"].id },
    { equipeA: "BFA U17", equipeB: "Union de Mokolo", scoreA: 1, scoreB: 0, date: daysFromNow(-13), type: "AMICAL", categorieId: categories["U17"].id },
  ];

  for (const r of resultatsData) {
    await prisma.resultat.create({
      data: { ...r, administrateurId: admin.id },
    });
  }
  console.log(`  ✔ ${resultatsData.length} résultats créés (U9, U15, U17)`);

  for (const nom of ["U9", "U15", "U17"]) {
    await recalculerClassement(categories[nom].id);
  }
  console.log("  ✔ classements recalculés (U9, U15, U17)");

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
