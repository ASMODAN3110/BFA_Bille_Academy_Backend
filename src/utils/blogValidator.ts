// Validateur Module 6 — Blog d'actualités — BFA Bille Football Academy
// Validation maison (PAS de Joi) : renvoie un tableau de messages français.
// Même convention que `teamSheetValidator.ts` / `albumValidator.ts`.
// L'API n'accepte que les valeurs de l'enum Prisma `CategorieArticle`
// (MATCHS, EVENEMENTS, PORTRAITS, COMMUNIQUES) : le frontend traduit les
// libellés (« Matchs », « Événements », …).

/** Catégories acceptées (valeurs exactes de l'enum Prisma). */
export const CATEGORIES_ARTICLE = [
  "MATCHS",
  "EVENEMENTS",
  "PORTRAITS",
  "COMMUNIQUES",
] as const;

const MIN_TITRE = 3;
const MIN_CONTENU = 20;
const MIN_AUTEUR = 2;

/** Retire le balisage HTML pour mesurer le texte réel du contenu (@EF33). */
function texteSansHtml(value: string): string {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function estNonVide(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function validerTitre(value: unknown, erreurs: string[]): void {
  if (!estNonVide(value)) {
    erreurs.push("Le titre est obligatoire.");
  } else if (value.trim().length < MIN_TITRE) {
    erreurs.push(`Le titre doit contenir au moins ${MIN_TITRE} caractères.`);
  }
}

function validerCategorie(value: unknown, erreurs: string[]): void {
  if (!estNonVide(value)) {
    erreurs.push("La catégorie est obligatoire.");
  } else if (!(CATEGORIES_ARTICLE as readonly string[]).includes(value.trim())) {
    erreurs.push(
      `La catégorie doit être l'une des suivantes : ${CATEGORIES_ARTICLE.join(", ")}.`,
    );
  }
}

function validerAuteur(value: unknown, erreurs: string[]): void {
  if (!estNonVide(value)) {
    erreurs.push("Le nom de l'auteur est obligatoire.");
  } else if (value.trim().length < MIN_AUTEUR) {
    erreurs.push(`Le nom de l'auteur doit contenir au moins ${MIN_AUTEUR} caractères.`);
  }
}

function validerContenu(value: unknown, erreurs: string[]): void {
  if (!estNonVide(value)) {
    erreurs.push("Le contenu est obligatoire.");
  } else if (texteSansHtml(value).length < MIN_CONTENU) {
    erreurs.push(
      `Le contenu doit comporter au moins ${MIN_CONTENU} caractères (hors balises HTML).`,
    );
  }
}

function validerImage(value: unknown, erreurs: string[]): void {
  if (value !== undefined && value !== null && !estNonVide(value)) {
    erreurs.push("Le champ « image » doit être une chaîne de caractères si renseigné.");
  }
}

function validerEstPublie(value: unknown, erreurs: string[]): void {
  if (value !== undefined && typeof value !== "boolean") {
    erreurs.push("Le champ « estPublie » doit être un booléen si renseigné.");
  }
}

function validerDatePublication(value: unknown, erreurs: string[]): void {
  if (
    value !== undefined &&
    value !== null &&
    (typeof value !== "string" || Number.isNaN(Date.parse(value)))
  ) {
    erreurs.push("Le champ « datePublication » doit être une date valide si renseigné.");
  }
}

/** Création (POST) et remplacement complet (PUT) : champs obligatoires (@EF32/@EF33). */
export function validateBlogCreate(body: Record<string, unknown>): string[] {
  const erreurs: string[] = [];
  validerTitre(body.titre, erreurs);
  validerCategorie(body.categorie, erreurs);
  validerAuteur(body.auteur, erreurs);
  validerContenu(body.contenu, erreurs);
  validerImage(body.image, erreurs);
  validerEstPublie(body.estPublie, erreurs);
  validerDatePublication(body.datePublication, erreurs);
  return erreurs;
}

/** PUT : mêmes règles que la création. */
export function validateBlogUpdate(body: Record<string, unknown>): string[] {
  return validateBlogCreate(body);
}

/** PATCH partiel : seuls les champs présents sont validés. */
export function validateBlogPatch(body: Record<string, unknown>): string[] {
  const erreurs: string[] = [];
  if (body.titre !== undefined) validerTitre(body.titre, erreurs);
  if (body.categorie !== undefined) validerCategorie(body.categorie, erreurs);
  if (body.auteur !== undefined) validerAuteur(body.auteur, erreurs);
  if (body.contenu !== undefined) validerContenu(body.contenu, erreurs);
  if (body.image !== undefined) validerImage(body.image, erreurs);
  if (body.estPublie !== undefined) validerEstPublie(body.estPublie, erreurs);
  if (body.datePublication !== undefined) validerDatePublication(body.datePublication, erreurs);
  return erreurs;
}
