// Service PDF — Fiche joueur (CV sportif) — BFA Bille Football Academy
// Rendu HTML → PDF via Chromium headless (puppeteer-core). Un seul navigateur
// partagé (singleton paresseux), une page par rendu, fermée dans `finally`.
// L'exécutable vient de `PUPPETEER_EXECUTABLE_PATH` (Docker : /usr/bin/chromium),
// sinon de chemins système courants (dev local Windows/Linux).

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer, { type Browser } from "puppeteer-core";
import { calculateAge } from "../utils/dateUtils";

/** Données minimales d'un joueur (avec sa catégorie) pour composer la fiche. */
export interface JoueurFiche {
  nom: string;
  prenom: string;
  dateNaissance: Date;
  poste: string;
  photo: string | null;
  dateArrivee: Date;
  categorie: { nom: string; ageMin: number; ageMax: number };
}

/** Échappement HTML des valeurs injectées dans le template (anti-XSS). */
function esc(valeur: unknown): string {
  return String(valeur ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

/** Retire accents et caractères non sûrs pour un nom de fichier Content-Disposition. */
export function slugFichier(valeur: string): string {
  return (
    valeur
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "joueur"
  );
}

/** Résout l'exécutable Chromium : variable d'env prioritaire, puis chemins courants. */
function resolveExecutablePath(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;

  const candidats = [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  for (const p of candidats) if (existsSync(p)) return p;

  // Dernier recours : le Chromium installé par Playwright (dev local Windows).
  const pwDir = join(process.env.LOCALAPPDATA ?? "", "ms-playwright");
  try {
    for (const d of readdirSync(pwDir)
      .filter((n) => n.startsWith("chromium-") && !n.includes("headless"))
      .sort()
      .reverse()) {
      const exe = join(pwDir, d, "chrome-win", "chrome.exe");
      if (existsSync(exe)) return exe;
    }
  } catch {
    /* dossier absent : on lève l'erreur ci-dessous */
  }

  throw new Error("Chromium introuvable : définir PUPPETEER_EXECUTABLE_PATH");
}

let browserPromise: Promise<Browser> | null = null;

/** Navigateur partagé, lancé paresseusement ; un échec de lancement autorise un retry. */
function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      executablePath: resolveExecutablePath(),
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    browserPromise.catch(() => {
      browserPromise = null;
    });
  }
  return browserPromise;
}

/** Rend un document HTML en PDF A4 (fonds imprimés), une page par rendu. */
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "load", timeout: 15000 });
    // Attendre la photo du joueur (ressource externe) avant le rendu.
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 15000 }).catch(() => {});
    return Buffer.from(await page.pdf({ format: "A4", printBackground: true }));
  } finally {
    await page.close();
  }
}

let logoBase64: string | null = null;

/** Logo du club embarqué en base64 — la fiche ne dépend d'aucune URL externe pour s'afficher. */
function logoDataUri(): string {
  if (!logoBase64) {
    const chemin = fileURLToPath(new URL("../assets/logo-bfa.png", import.meta.url));
    logoBase64 = readFileSync(chemin).toString("base64");
  }
  return `data:image/png;base64,${logoBase64}`;
}

/** Date en français (ex. « 15 janv. 2016 »), sans dépendance à moment/date-fns. */
function formatDateFr(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/** Compose le HTML de la fiche joueur : en-tête club, identité, informations, pied de page. */
export function ficheJoueurHtml(joueur: JoueurFiche): string {
  const age = calculateAge(joueur.dateNaissance);
  const initiales = `${joueur.prenom.charAt(0)}${joueur.nom.charAt(0)}`.toUpperCase();
  const photo = joueur.photo
    ? `<img src="${esc(joueur.photo)}" alt="" onerror="this.remove()">`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1a1a1a; }
  .page { padding: 40px 48px; }
  header { display: flex; align-items: center; gap: 16px; border-bottom: 4px solid #d4af37; padding-bottom: 18px; }
  header img { height: 64px; width: 64px; object-fit: contain; }
  header h1 { font-size: 22px; color: #006400; }
  header p { font-size: 12px; color: #666; margin-top: 2px; }
  .emission { margin-left: auto; text-align: right; font-size: 11px; color: #888; }
  .identite { display: flex; align-items: center; gap: 24px; margin: 28px 0; }
  .photo { position: relative; width: 120px; height: 120px; border-radius: 16px;
           border: 3px solid #d4af37; background: #004d00; overflow: hidden; flex-shrink: 0; }
  .photo .initiales { position: absolute; inset: 0; display: flex; align-items: center;
                      justify-content: center; font-size: 40px; font-weight: 700; color: #d4af37; }
  .photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .identite h2 { font-size: 26px; color: #004d00; }
  .identite .poste { font-size: 14px; color: #555; margin-top: 4px; }
  .badge { display: inline-block; margin-top: 10px; padding: 4px 14px; border-radius: 999px;
           background: #d4af37; color: #004d00; font-weight: 700; font-size: 13px; }
  h3 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #006400;
       border-bottom: 2px solid #006400; padding-bottom: 6px; margin-bottom: 14px; }
  .infos { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .info { background: #f4f7f4; border-left: 4px solid #006400; border-radius: 6px; padding: 12px 16px; }
  .info .label { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: #777; }
  .info .valeur { font-size: 15px; font-weight: 600; color: #1a1a1a; margin-top: 3px; }
  footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #ddd;
           display: flex; justify-content: space-between; font-size: 10px; color: #999; }
</style></head>
<body><div class="page">
  <header>
    <img src="${logoDataUri()}" alt="Logo BFA">
    <div>
      <h1>BFA Bille Football Academy</h1>
      <p>Fiche joueur — profil officiel de l'académie</p>
    </div>
    <div class="emission">Émise le<br>${esc(formatDateFr(new Date()))}</div>
  </header>

  <section class="identite">
    <div class="photo"><span class="initiales">${esc(initiales)}</span>${photo}</div>
    <div>
      <h2>${esc(joueur.nom.toUpperCase())} ${esc(joueur.prenom)}</h2>
      <div class="poste">${esc(joueur.poste)}</div>
      <span class="badge">${esc(joueur.categorie.nom)} · ${joueur.categorie.ageMin}–${joueur.categorie.ageMax} ans</span>
    </div>
  </section>

  <section>
    <h3>Informations personnelles</h3>
    <div class="infos">
      <div class="info"><div class="label">Âge</div><div class="valeur">${age} ans</div></div>
      <div class="info"><div class="label">Date de naissance</div><div class="valeur">${esc(formatDateFr(joueur.dateNaissance))}</div></div>
      <div class="info"><div class="label">Poste</div><div class="valeur">${esc(joueur.poste)}</div></div>
      <div class="info"><div class="label">À l'académie depuis</div><div class="valeur">${esc(formatDateFr(joueur.dateArrivee))}</div></div>
    </div>
  </section>

  <footer>
    <span>www.bille-football-academy.com</span>
    <span>Document généré par le back-office BFA</span>
  </footer>
</div></body></html>`;
}

/**
 * Génère la fiche PDF d'un joueur (une page A4).
 * @param joueur joueur complet (catégorie incluse) déjà chargé depuis la base
 */
export async function genererFicheJoueurPdf(joueur: JoueurFiche): Promise<Buffer> {
  return renderHtmlToPdf(ficheJoueurHtml(joueur));
}
