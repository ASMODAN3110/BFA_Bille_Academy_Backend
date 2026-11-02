// Validateur Module 8 — Boutique (produits + devis) — BFA Bille Football Academy
// Validation maison (PAS de Joi) : renvoie un tableau de messages français.
// Même convention que `blogValidator.ts` / `resultValidator.ts`.
// L'API n'accepte que les valeurs exactes de l'enum Prisma `Taille` (S, M, L,
// XL, UNIQUE) et les catégories de la boutique : le frontend traduit ses libellés.

/** Catégories de la boutique (valeurs exactes stockées en base). */
export const CATEGORIES_PRODUIT = ["Vêtements", "Équipement", "Accessoires"] as const;

/** Tailles acceptées (valeurs exactes de l'enum Prisma `Taille`). */
export const TAILLES = ["S", "M", "L", "XL", "UNIQUE"] as const;

const MIN_NOM = 3;
const MIN_DESCRIPTION = 10;
const MIN_NOM_COMPLET = 2;
const MIN_TELEPHONE = 8;
/** Nombre maximal d'articles (lignes) dans une même demande de devis. */
export const MAX_LIGNES_DEVIS = 20;

function estNonVide(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/** Ramène `tailles` (tableau JSON, ou chaîne JSON en multipart) à un tableau ; null sinon. */
function lireTableau(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    try {
      const p = JSON.parse(value);
      return Array.isArray(p) ? p : null;
    } catch {
      return null;
    }
  }
  return null;
}

// ---- Produit ----

function validerNom(value: unknown, erreurs: string[]): void {
  if (!estNonVide(value)) erreurs.push("Le nom du produit est obligatoire.");
  else if (value.trim().length < MIN_NOM)
    erreurs.push(`Le nom doit contenir au moins ${MIN_NOM} caractères.`);
}

function validerDescription(value: unknown, erreurs: string[]): void {
  if (!estNonVide(value)) erreurs.push("La description est obligatoire.");
  else if (value.trim().length < MIN_DESCRIPTION)
    erreurs.push(`La description doit contenir au moins ${MIN_DESCRIPTION} caractères.`);
}

function validerPrix(value: unknown, erreurs: string[]): void {
  const n = Number(value);
  if (value === undefined || value === null || value === "" || !Number.isFinite(n) || n <= 0)
    erreurs.push("Le prix doit être un nombre positif.");
}

function validerTailles(value: unknown, erreurs: string[]): void {
  const tailles = lireTableau(value);
  if (!tailles || tailles.length === 0) {
    erreurs.push("Au moins une taille doit être sélectionnée.");
    return;
  }
  const invalides = tailles.filter((t) => !(TAILLES as readonly string[]).includes(String(t)));
  if (invalides.length > 0)
    erreurs.push(`Les tailles doivent être parmi : ${TAILLES.join(", ")}.`);
}

function validerCategorie(value: unknown, erreurs: string[]): void {
  if (!estNonVide(value)) erreurs.push("La catégorie est obligatoire.");
  else if (!(CATEGORIES_PRODUIT as readonly string[]).includes(value.trim()))
    erreurs.push(`La catégorie doit être l'une des suivantes : ${CATEGORIES_PRODUIT.join(", ")}.`);
}

function validerStock(value: unknown, erreurs: string[]): void {
  if (value === undefined || value === null || value === "") return;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) erreurs.push("Le stock doit être un nombre entier positif ou nul.");
}

function validerEstNouveau(value: unknown, erreurs: string[]): void {
  if (value === undefined || value === null) return;
  if (value !== true && value !== false && value !== "true" && value !== "false")
    erreurs.push("Le champ « estNouveau » doit être un booléen.");
}

function validerImage(value: unknown, erreurs: string[]): void {
  if (value !== undefined && value !== null && !estNonVide(value))
    erreurs.push("Le champ « image » doit être une chaîne de caractères si renseigné.");
}

/** Création (POST) et remplacement complet (PUT) : champs obligatoires (@EF44). */
export function validateProductCreate(body: Record<string, unknown>): string[] {
  const erreurs: string[] = [];
  validerNom(body.nom, erreurs);
  validerDescription(body.description, erreurs);
  validerPrix(body.prix, erreurs);
  validerTailles(body.tailles, erreurs);
  validerCategorie(body.categorie, erreurs);
  validerStock(body.stock, erreurs);
  validerEstNouveau(body.estNouveau, erreurs);
  validerImage(body.image, erreurs);
  return erreurs;
}

/** PUT : mêmes règles que la création. */
export function validateProductUpdate(body: Record<string, unknown>): string[] {
  return validateProductCreate(body);
}

// ---- Devis ----

function validerNomComplet(value: unknown, erreurs: string[]): void {
  if (!estNonVide(value)) erreurs.push("Le nom complet est obligatoire.");
  else if (value.trim().length < MIN_NOM_COMPLET)
    erreurs.push(`Le nom complet doit contenir au moins ${MIN_NOM_COMPLET} caractères.`);
}

function validerEmail(value: unknown, erreurs: string[]): void {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) erreurs.push("L'email est obligatoire.");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) erreurs.push("L'email n'est pas valide.");
}

/** @EF43 : le téléphone est OBLIGATOIRE (refus de la demande sinon). */
function validerTelephone(value: unknown, erreurs: string[]): void {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) erreurs.push("Le téléphone est obligatoire.");
  else if (v.length < MIN_TELEPHONE)
    erreurs.push(`Le téléphone doit contenir au moins ${MIN_TELEPHONE} caractères.`);
}

function validerProduitId(value: unknown, erreurs: string[], prefixe = ""): void {
  const n = Number(value);
  if (value === undefined || value === null || value === "" || !Number.isInteger(n) || n <= 0)
    erreurs.push(`${prefixe}Le produit est obligatoire (identifiant numérique valide).`);
}

function validerQuantite(value: unknown, erreurs: string[], prefixe = ""): void {
  const n = Number(value);
  if (value === undefined || value === null || value === "" || !Number.isInteger(n) || n < 1)
    erreurs.push(`${prefixe}La quantité doit être un nombre entier d'au moins 1.`);
}

function validerTaille(value: unknown, erreurs: string[], prefixe = ""): void {
  if (value === undefined || value === null || value === "") return;
  if (!(TAILLES as readonly string[]).includes(String(value)))
    erreurs.push(`${prefixe}La taille doit être l'une des suivantes : ${TAILLES.join(", ")}.`);
}

/** Une ligne d'un devis : produit, quantité et taille (facultative). */
export interface LigneDevisBrute {
  produitId?: unknown;
  quantite?: unknown;
  taille?: unknown;
}

/**
 * Lignes d'une demande de devis. Format courant : `lignes: [{ produitId, quantite, taille? }]`.
 * Ancien format (un seul produit à la racine : `produitId`, `quantite`, `taille`) toujours
 * accepté : il équivaut à une demande d'une seule ligne.
 */
export function lignesDuDevis(body: Record<string, unknown>): LigneDevisBrute[] | null {
  if (body.lignes !== undefined) return Array.isArray(body.lignes) ? (body.lignes as LigneDevisBrute[]) : null;
  return [{ produitId: body.produitId, quantite: body.quantite, taille: body.taille }];
}

function validerMessage(value: unknown, erreurs: string[]): void {
  if (value !== undefined && value !== null && typeof value !== "string")
    erreurs.push("Le message doit être une chaîne de caractères.");
}

/** Demande de devis (@EF42, @EF43), pour un ou plusieurs articles. */
export function validateQuoteCreate(body: Record<string, unknown>): string[] {
  const erreurs: string[] = [];
  validerNomComplet(body.nomComplet, erreurs);
  validerEmail(body.email, erreurs);
  validerTelephone(body.telephone, erreurs);

  const lignes = lignesDuDevis(body);
  if (lignes === null) {
    erreurs.push("Les articles du devis doivent être fournis sous forme de liste.");
  } else if (lignes.length === 0) {
    erreurs.push("Le devis doit contenir au moins un article.");
  } else if (lignes.length > MAX_LIGNES_DEVIS) {
    erreurs.push(`Le devis ne peut pas contenir plus de ${MAX_LIGNES_DEVIS} articles.`);
  } else {
    lignes.forEach((ligne, i) => {
      // Préfixe « Article n : » seulement quand il y a plusieurs lignes.
      const prefixe = lignes.length > 1 ? `Article ${i + 1} : ` : "";
      if (ligne === null || typeof ligne !== "object" || Array.isArray(ligne)) {
        erreurs.push(`${prefixe}Article invalide.`);
        return;
      }
      validerProduitId(ligne.produitId, erreurs, prefixe);
      validerQuantite(ligne.quantite, erreurs, prefixe);
      validerTaille(ligne.taille, erreurs, prefixe);
    });
  }

  validerMessage(body.message, erreurs);
  return erreurs;
}
