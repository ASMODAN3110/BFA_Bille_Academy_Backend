-- Devis à plusieurs articles : un devis porte désormais une ou plusieurs lignes.
-- Les devis existants sont conservés : chacun est converti en une ligne avant que
-- les anciennes colonnes (produitId, quantite, taille) ne soient retirées de "Devis".
BEGIN;

-- CreateTable
CREATE TABLE "LigneDevis" (
    "id" SERIAL NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "taille" "Taille",
    "produitNom" TEXT NOT NULL,
    "devisId" INTEGER NOT NULL,
    "produitId" INTEGER,

    CONSTRAINT "LigneDevis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LigneDevis_devisId_idx" ON "LigneDevis"("devisId");

-- CreateIndex
CREATE INDEX "LigneDevis_produitId_idx" ON "LigneDevis"("produitId");

-- AddForeignKey
ALTER TABLE "LigneDevis" ADD CONSTRAINT "LigneDevis_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneDevis" ADD CONSTRAINT "LigneDevis_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Conserve les devis existants : une ligne par devis (copie du nom du produit)
INSERT INTO "LigneDevis" ("devisId", "produitId", "produitNom", "quantite", "taille")
SELECT d."id", d."produitId", p."nom", d."quantite", d."taille"
FROM "Devis" d
JOIN "Produit" p ON p."id" = d."produitId";

-- DropForeignKey
ALTER TABLE "Devis" DROP CONSTRAINT "Devis_produitId_fkey";

-- DropIndex
DROP INDEX "Devis_produitId_idx";

-- AlterTable
ALTER TABLE "Devis" DROP COLUMN "produitId",
DROP COLUMN "quantite",
DROP COLUMN "taille";

COMMIT;
