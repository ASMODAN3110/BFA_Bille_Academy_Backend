// Seeder de démonstration S3/MinIO — BFA Bille Football Academy
// Exécuté sur le HOST via `npm run db:seed-media` (= `tsx scripts/seedMedia.ts`).
//
// Prérequis :
//   1. MinIO démarré (`npm run minio:start`) et bucket créé (`npm run minio:create-bucket`) ;
//   2. Base seedée (`npm run db:seed`) : joueurs, albums, articles, produits existent.
//
// Ce script :
//   - génère des images PNG de démonstration (couleurs pleines, sans dépendance externe) ;
//   - les uploade vers MinIO dans les 4 dossiers autorisés (joueurs, galerie, blog, boutique) ;
//   - met à jour la base : `Joueur.photo`, `Album.medias` (Json → URLs), `Article.image`,
//     `Produit.image` — pour que les médias s'affichent réellement sur les pages.
//
// Option `--clean` : supprime d'abord tous les fichiers du bucket (seed reproductible).

import "dotenv/config";
import { deflateSync } from "node:zlib";
import prisma from "../src/config/database";
import { BUCKET } from "../src/config/s3";
import {
  deleteFile,
  ensureBucket,
  listFiles,
  uploadFile,
  type Dossier,
} from "../src/services/storageService";

// ---------------------------------------------------------------------
// Génération d'un PNG valide (couleur pleine) — sans dépendance externe
// ---------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** Génère un PNG 320×200 de couleur pleine, valide et prêt à uploader. */
function makePng(width: number, height: number, rgb: [number, number, number]): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); // largeur
  ihdr.writeUInt32BE(height, 4); // hauteur
  ihdr.writeUInt8(8, 8); // profondeur 8 bits
  ihdr.writeUInt8(2, 9); // type de couleur : truecolor (RGB)
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filtre
  ihdr.writeUInt8(0, 12); // entrelacement
  const row = Buffer.alloc(1 + width * 3);
  row[0] = 0; // filtre « None » pour la ligne
  for (let x = 0; x < width; x++) {
    row[1 + x * 3] = rgb[0];
    row[2 + x * 3] = rgb[1];
    row[3 + x * 3] = rgb[2];
  }
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const idat = deflateSync(raw);
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

const W = 320;
const H = 200;

/** Petite palette aux couleurs de l'académie — chaque entité reçoit une couleur différente. */
const PALETTE: [number, number, number][] = [
  [16, 185, 129], // émeraude
  [212, 175, 55], // doré
  [59, 130, 246], // bleu
  [239, 68, 68], // rouge
  [168, 85, 247], // violet
  [249, 115, 22], // orange
  [14, 165, 233], // cyan
  [34, 197, 94], // vert
];

const pick = (i: number): [number, number, number] => PALETTE[i % PALETTE.length];

/** Upload une image PNG de démo dans un dossier ; renvoie son URL publique. */
async function uploadImage(dossier: Dossier, nom: string, i: number): Promise<string> {
  const media = await uploadFile({
    dossier,
    fichier: { buffer: makePng(W, H, pick(i)), mimetype: "image/png", originalname: nom },
  });
  return media.url;
}

// ---------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------

async function main() {
  await ensureBucket();
  console.log(`→ Bucket « ${BUCKET} » prêt.`);

  if (process.argv.includes("--clean")) {
    const fichiers = await listFiles();
    for (const f of fichiers) await deleteFile(f.key);
    console.log(`→ ${fichiers.length} fichier(s) existant(s) supprimé(s) du bucket.`);
  }

  // ---- Joueurs : une photo par académicien ----
  const joueurs = await prisma.joueur.findMany({ select: { id: true, prenom: true, nom: true } });
  for (const [i, j] of joueurs.entries()) {
    const url = await uploadImage("joueurs", `photo-${j.prenom}-${j.nom}.png`, i);
    await prisma.joueur.update({ where: { id: j.id }, data: { photo: url } });
  }
  console.log(`  ✔ ${joueurs.length} photo(s) de joueur uploadée(s) et associée(s).`);

  // ---- Albums : `medias` (Json) remplacés par de vraies URLs galerie ----
  const albums = await prisma.album.findMany({ select: { id: true, titre: true } });
  for (const [i, a] of albums.entries()) {
    const urls: string[] = [];
    const count = 3 + (i % 2); // 3 photos pour le 1er album, 4 pour le 2e
    for (let k = 0; k < count; k++) {
      urls.push(await uploadImage("galerie", `album-${a.titre}-${k + 1}.png`, i + k));
    }
    await prisma.album.update({ where: { id: a.id }, data: { medias: urls } });
  }
  console.log(`  ✔ ${albums.length} album(s) mis à jour (medias → URLs galerie).`);

  // ---- Articles : image ----
  const articles = await prisma.article.findMany({ select: { id: true } });
  for (const [i, a] of articles.entries()) {
    const url = await uploadImage("blog", `article-${i + 1}.png`, i + 2);
    await prisma.article.update({ where: { id: a.id }, data: { image: url } });
  }
  console.log(`  ✔ ${articles.length} article(s) avec image.`);

  // ---- Produits : image ----
  const produits = await prisma.produit.findMany({ select: { id: true, nom: true } });
  for (const [i, p] of produits.entries()) {
    const url = await uploadImage("boutique", `produit-${p.nom}.png`, i + 4);
    await prisma.produit.update({ where: { id: p.id }, data: { image: url } });
  }
  console.log(`  ✔ ${produits.length} produit(s) avec image.`);

  console.log("\n✅ Seed média S3 terminé. Rechargez la galerie / les fiches pour voir les médias.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
