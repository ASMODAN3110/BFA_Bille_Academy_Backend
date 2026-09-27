// Validateur des champs d'une catégorie — BFA Bille Football Academy
// Style de `src/utils/playerValidator.ts` : fonctions simples, aucune dépendance.
// `validateCategoryInput` renvoie une liste de messages d'erreur (vide = données valides).

/** Vrai si `value` est une chaîne non vide après suppression des espaces. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Vrai si `value` est un entier (nombre ou chaîne numérique). */
function isInteger(value: unknown): boolean {
  if (typeof value === "string" && value.trim() === "") return false;
  const n = Number(value);
  return Number.isInteger(n);
}

/**
 * Valide le body d'une catégorie (création ou modification).
 * Règles métier :
 *   - nom : obligatoire, ≥ 2 caractères, non vide
 *   - ageMin : entier obligatoire, compris entre 9 et 17
 *   - ageMax : entier obligatoire, compris entre 9 et 17
 *   - ageMin <= ageMax
 * @param body objet JSON reçu (`req.body`)
 * @returns liste des messages d'erreur ; vide si les données sont valides.
 */
export function validateCategoryInput(body: Record<string, unknown>): string[] {
  const erreurs: string[] = [];

  const nom = body.nom;
  if (!isNonEmptyString(nom) || nom.trim().length < 2) {
    erreurs.push("Le nom de la catégorie est obligatoire (au moins 2 caractères).");
  }

  const ageMin = body.ageMin;
  if (!isInteger(ageMin)) {
    erreurs.push("L'âge minimum est obligatoire et doit être un entier.");
  } else if (Number(ageMin) < 9 || Number(ageMin) > 17) {
    erreurs.push("L'âge minimum doit être compris entre 9 et 17 ans.");
  }

  const ageMax = body.ageMax;
  if (!isInteger(ageMax)) {
    erreurs.push("L'âge maximum est obligatoire et doit être un entier.");
  } else if (Number(ageMax) < 9 || Number(ageMax) > 17) {
    erreurs.push("L'âge maximum doit être compris entre 9 et 17 ans.");
  }

  // Cohérence : ageMin <= ageMax (seulement si les deux sont valides)
  if (isInteger(ageMin) && isInteger(ageMax) && Number(ageMin) > Number(ageMax)) {
    erreurs.push("L'âge minimum ne peut pas être supérieur à l'âge maximum.");
  }

  return erreurs;
}
