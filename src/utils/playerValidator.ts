// Validateur des champs d'un joueur — BFA Bille Football Academy
// Style de `src/utils/validators.ts` : fonctions simples, aucune dépendance.
// `validatePlayerInput` renvoie une liste de messages d'erreur (vide = données valides).

/** Vrai si `value` est une chaîne non vide après suppression des espaces. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Vrai si `value` est un entier strictement positif (nombre ou chaîne numérique). */
function isPositiveInteger(value: unknown): boolean {
  if (typeof value === "string" && value.trim() === "") return false;
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

/**
 * Valide le body d'un joueur (création ou modification).
 * @param body objet JSON reçu (`req.body`)
 * @returns liste des messages d'erreur ; vide si les données sont valides.
 */
export function validatePlayerInput(body: Record<string, unknown>): string[] {
  const erreurs: string[] = [];

  const nom = body.nom;
  if (!isNonEmptyString(nom) || nom.trim().length < 2) {
    erreurs.push("Le nom est obligatoire (au moins 2 caractères).");
  }

  const prenom = body.prenom;
  if (!isNonEmptyString(prenom) || prenom.trim().length < 2) {
    erreurs.push("Le prénom est obligatoire (au moins 2 caractères).");
  }

  const poste = body.poste;
  if (!isNonEmptyString(poste)) {
    erreurs.push("Le poste est obligatoire.");
  }

  const dateNaissance = body.dateNaissance;
  if (typeof dateNaissance !== "string" || Number.isNaN(Date.parse(dateNaissance))) {
    erreurs.push("La date de naissance est obligatoire et doit être une date valide.");
  } else if (new Date(dateNaissance).getTime() > Date.now()) {
    erreurs.push("La date de naissance doit être dans le passé.");
  }

  const categorieId = body.categorieId;
  if (!isPositiveInteger(categorieId)) {
    erreurs.push("La catégorie est obligatoire (identifiant entier positif).");
  }

  const photo = body.photo;
  if (photo !== undefined && photo !== null && (!isNonEmptyString(photo) || photo.trim() === "")) {
    erreurs.push("La photo doit être une chaîne (URL) ou absente.");
  }

  return erreurs;
}
