// Validateur Module 7 — Résultats de matchs — BFA Bille Football Academy
// Validation maison (PAS de Joi) : renvoie un tableau de messages français.
// Même convention que `blogValidator.ts` / `teamSheetValidator.ts`.
// L'API n'accepte que les valeurs de l'enum Prisma `TypeMatch` (AMICAL,
// CHAMPIONNAT) et un `categorieId` numérique : le frontend traduit les libellés
// (« Amical », « Championnat », …).

/** Types de match acceptés (valeurs exactes de l'enum Prisma `TypeMatch`). */
export const TYPES_MATCH = ["AMICAL", "CHAMPIONNAT"] as const;

const MIN_NOM_EQUIPE = 2;

function estNonVide(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/** Nom d'une équipe : obligatoire, au moins 2 caractères. */
function validerEquipe(
  value: unknown,
  libelle: "équipe à domicile" | "équipe adverse",
  erreurs: string[],
): void {
  if (!estNonVide(value)) {
    erreurs.push(`L'${libelle} est obligatoire.`);
  } else if (value.trim().length < MIN_NOM_EQUIPE) {
    erreurs.push(`L'${libelle} doit contenir au moins ${MIN_NOM_EQUIPE} caractères.`);
  }
}

/** Score : nombre entier positif (accepte le chiffre ou la chaîne numérique). */
function validerScore(
  value: unknown,
  libelle: "scoreA" | "scoreB",
  erreurs: string[],
): void {
  const n = Number(value);
  if (
    typeof value === "boolean" ||
    value === undefined ||
    value === null ||
    value === "" ||
    !Number.isInteger(n) ||
    n < 0
  ) {
    erreurs.push(`Le score « ${libelle} » doit être un nombre entier positif.`);
  }
}

/** Date : obligatoire et parsable par `Date.parse` ("YYYY-MM-DD" ou ISO). */
function validerDate(value: unknown, erreurs: string[]): void {
  if (typeof value !== "string" || value.trim() === "" || Number.isNaN(Date.parse(value))) {
    erreurs.push("La date du match est obligatoire et doit être une date valide.");
  }
}

/** Type : valeur exacte de l'enum (`AMICAL` / `CHAMPIONNAT`), pas le libellé. */
function validerType(value: unknown, erreurs: string[]): void {
  if (!estNonVide(value)) {
    erreurs.push("Le type de match est obligatoire.");
  } else if (!(TYPES_MATCH as readonly string[]).includes(value.trim())) {
    erreurs.push(`Le type doit être l'un des suivants : ${TYPES_MATCH.join(", ")}.`);
  }
}

/** Catégorie : identifiant numérique obligatoire (vérifié en base par le service). */
function validerCategorieId(value: unknown, erreurs: string[]): void {
  const n = Number(value);
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    typeof value === "boolean" ||
    !Number.isInteger(n) ||
    n <= 0
  ) {
    erreurs.push("La catégorie est obligatoire (identifiant numérique valide).");
  }
}

/** Les deux équipes d'un match ne peuvent pas être identiques. */
function validerEquipesDifferentes(
  equipeA: unknown,
  equipeB: unknown,
  erreurs: string[],
): void {
  if (
    typeof equipeA === "string" &&
    typeof equipeB === "string" &&
    equipeA.trim().toLowerCase() === equipeB.trim().toLowerCase()
  ) {
    erreurs.push("Les deux équipes doivent être différentes.");
  }
}

/** Création (POST) et remplacement complet (PUT) : champs obligatoires (@EF37/@EF38). */
export function validateResultCreate(body: Record<string, unknown>): string[] {
  const erreurs: string[] = [];
  validerEquipe(body.equipeA, "équipe à domicile", erreurs);
  validerEquipe(body.equipeB, "équipe adverse", erreurs);
  validerScore(body.scoreA, "scoreA", erreurs);
  validerScore(body.scoreB, "scoreB", erreurs);
  validerDate(body.date, erreurs);
  validerType(body.type, erreurs);
  validerCategorieId(body.categorieId, erreurs);
  validerEquipesDifferentes(body.equipeA, body.equipeB, erreurs);
  return erreurs;
}

/** PUT : mêmes règles que la création (remplacement complet). */
export function validateResultUpdate(body: Record<string, unknown>): string[] {
  return validateResultCreate(body);
}
