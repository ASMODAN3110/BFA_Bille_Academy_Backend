-- CreateEnum
CREATE TYPE "TypeMatch" AS ENUM ('AMICAL', 'CHAMPIONNAT');

-- CreateEnum
CREATE TYPE "TypeEvenement" AS ENUM ('MATCH', 'ENTRAINEMENT');

-- CreateEnum
CREATE TYPE "StatutDemande" AS ENUM ('EN_ATTENTE', 'CONFIRME', 'REFUSE');

-- CreateEnum
CREATE TYPE "CategorieArticle" AS ENUM ('MATCHS', 'EVENEMENTS', 'PORTRAITS', 'COMMUNIQUES');

-- CreateEnum
CREATE TYPE "Taille" AS ENUM ('S', 'M', 'L', 'XL');

-- CreateTable
CREATE TABLE "Categorie" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "ageMin" INTEGER NOT NULL,
    "ageMax" INTEGER NOT NULL,

    CONSTRAINT "Categorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Joueur" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "dateNaissance" TIMESTAMP(3) NOT NULL,
    "poste" TEXT NOT NULL,
    "photo" TEXT,
    "dateArrivee" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categorieId" INTEGER NOT NULL,
    "administrateurId" INTEGER,

    CONSTRAINT "Joueur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evenement" (
    "id" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "heure" TEXT NOT NULL,
    "lieu" TEXT NOT NULL,
    "type" "TypeEvenement" NOT NULL,
    "equipeA" TEXT,
    "equipeB" TEXT,
    "scoreA" INTEGER,
    "scoreB" INTEGER,
    "typeMatch" "TypeMatch",
    "objectif" TEXT,
    "duree" INTEGER,
    "categorieId" INTEGER NOT NULL,
    "administrateurId" INTEGER,

    CONSTRAINT "Evenement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeEssai" (
    "id" SERIAL NOT NULL,
    "nomJoueur" TEXT NOT NULL,
    "prenomJoueur" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dateEssai" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "statut" "StatutDemande" NOT NULL DEFAULT 'EN_ATTENTE',
    "motifRefus" TEXT,
    "dateSoumission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "administrateurId" INTEGER,

    CONSTRAINT "DemandeEssai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Album" (
    "id" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "theme" TEXT NOT NULL,
    "medias" JSONB NOT NULL,
    "administrateurId" INTEGER,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FicheTechnique" (
    "id" SERIAL NOT NULL,
    "staff" TEXT NOT NULL,
    "palmares" TEXT NOT NULL,
    "objectifs" TEXT NOT NULL,
    "saison" TEXT NOT NULL,
    "categorieId" INTEGER NOT NULL,
    "modifieParId" INTEGER,

    CONSTRAINT "FicheTechnique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "image" TEXT,
    "categorie" "CategorieArticle" NOT NULL,
    "datePublication" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auteur" TEXT NOT NULL,
    "estPublie" BOOLEAN NOT NULL DEFAULT false,
    "administrateurId" INTEGER,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resultat" (
    "id" SERIAL NOT NULL,
    "equipeA" TEXT NOT NULL,
    "equipeB" TEXT NOT NULL,
    "scoreA" INTEGER NOT NULL,
    "scoreB" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "TypeMatch" NOT NULL DEFAULT 'AMICAL',
    "categorieId" INTEGER,
    "administrateurId" INTEGER,

    CONSTRAINT "Resultat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classement" (
    "id" SERIAL NOT NULL,
    "equipe" TEXT NOT NULL,
    "matchsJoues" INTEGER NOT NULL DEFAULT 0,
    "victoires" INTEGER NOT NULL DEFAULT 0,
    "nuls" INTEGER NOT NULL DEFAULT 0,
    "defaites" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "categorieId" INTEGER NOT NULL,

    CONSTRAINT "Classement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produit" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "prix" DOUBLE PRECISION NOT NULL,
    "image" TEXT,
    "tailles" "Taille"[],
    "administrateurId" INTEGER,

    CONSTRAINT "Produit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Devis" (
    "id" SERIAL NOT NULL,
    "nomComplet" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "taille" "Taille",
    "message" TEXT,
    "dateDemande" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estTraite" BOOLEAN NOT NULL DEFAULT false,
    "produitId" INTEGER NOT NULL,
    "administrateurId" INTEGER,

    CONSTRAINT "Devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Administrateur" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "derniereConnexion" TIMESTAMP(3),
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Administrateur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Categorie_nom_key" ON "Categorie"("nom");

-- CreateIndex
CREATE INDEX "Categorie_nom_idx" ON "Categorie"("nom");

-- CreateIndex
CREATE INDEX "Joueur_categorieId_idx" ON "Joueur"("categorieId");

-- CreateIndex
CREATE INDEX "Joueur_nom_idx" ON "Joueur"("nom");

-- CreateIndex
CREATE INDEX "Evenement_date_idx" ON "Evenement"("date");

-- CreateIndex
CREATE INDEX "Evenement_categorieId_idx" ON "Evenement"("categorieId");

-- CreateIndex
CREATE INDEX "Evenement_type_idx" ON "Evenement"("type");

-- CreateIndex
CREATE INDEX "DemandeEssai_statut_idx" ON "DemandeEssai"("statut");

-- CreateIndex
CREATE INDEX "DemandeEssai_email_idx" ON "DemandeEssai"("email");

-- CreateIndex
CREATE INDEX "DemandeEssai_administrateurId_idx" ON "DemandeEssai"("administrateurId");

-- CreateIndex
CREATE INDEX "Album_dateCreation_idx" ON "Album"("dateCreation");

-- CreateIndex
CREATE UNIQUE INDEX "FicheTechnique_categorieId_key" ON "FicheTechnique"("categorieId");

-- CreateIndex
CREATE INDEX "Article_datePublication_idx" ON "Article"("datePublication");

-- CreateIndex
CREATE INDEX "Article_categorie_idx" ON "Article"("categorie");

-- CreateIndex
CREATE INDEX "Article_estPublie_idx" ON "Article"("estPublie");

-- CreateIndex
CREATE INDEX "Resultat_date_idx" ON "Resultat"("date");

-- CreateIndex
CREATE INDEX "Resultat_categorieId_idx" ON "Resultat"("categorieId");

-- CreateIndex
CREATE INDEX "Classement_categorieId_idx" ON "Classement"("categorieId");

-- CreateIndex
CREATE UNIQUE INDEX "Classement_categorieId_equipe_key" ON "Classement"("categorieId", "equipe");

-- CreateIndex
CREATE INDEX "Produit_nom_idx" ON "Produit"("nom");

-- CreateIndex
CREATE INDEX "Devis_produitId_idx" ON "Devis"("produitId");

-- CreateIndex
CREATE INDEX "Devis_estTraite_idx" ON "Devis"("estTraite");

-- CreateIndex
CREATE UNIQUE INDEX "Administrateur_email_key" ON "Administrateur"("email");

-- CreateIndex
CREATE INDEX "Administrateur_email_idx" ON "Administrateur"("email");

-- AddForeignKey
ALTER TABLE "Joueur" ADD CONSTRAINT "Joueur_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Joueur" ADD CONSTRAINT "Joueur_administrateurId_fkey" FOREIGN KEY ("administrateurId") REFERENCES "Administrateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evenement" ADD CONSTRAINT "Evenement_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evenement" ADD CONSTRAINT "Evenement_administrateurId_fkey" FOREIGN KEY ("administrateurId") REFERENCES "Administrateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeEssai" ADD CONSTRAINT "DemandeEssai_administrateurId_fkey" FOREIGN KEY ("administrateurId") REFERENCES "Administrateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_administrateurId_fkey" FOREIGN KEY ("administrateurId") REFERENCES "Administrateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FicheTechnique" ADD CONSTRAINT "FicheTechnique_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FicheTechnique" ADD CONSTRAINT "FicheTechnique_modifieParId_fkey" FOREIGN KEY ("modifieParId") REFERENCES "Administrateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_administrateurId_fkey" FOREIGN KEY ("administrateurId") REFERENCES "Administrateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resultat" ADD CONSTRAINT "Resultat_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resultat" ADD CONSTRAINT "Resultat_administrateurId_fkey" FOREIGN KEY ("administrateurId") REFERENCES "Administrateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classement" ADD CONSTRAINT "Classement_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produit" ADD CONSTRAINT "Produit_administrateurId_fkey" FOREIGN KEY ("administrateurId") REFERENCES "Administrateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devis" ADD CONSTRAINT "Devis_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devis" ADD CONSTRAINT "Devis_administrateurId_fkey" FOREIGN KEY ("administrateurId") REFERENCES "Administrateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
