// Validateur des champs d'un événement — BFA Bille Football Academy
// Style de `src/utils/playerValidator.ts` : fonctions simples, aucune dépendance.
// `validateEventInput` renvoie une liste de messages d'erreur (vide = données valides).
//
// NB : la cohérence type/champs (un MATCH doit avoir deux équipes, un ENTRAINEMENT
// objectif/duree) est une RÈGLE MÉTIER vérifiée dans `src/services/eventService.ts`
// (`verifierChampsParType`), pas ici.

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

/** Vrai si `value` est un entier ≥ 0 (nombre ou chaîne numérique). */
function isNonNegativeInteger(value: unknown): boolean {
  if (typeof value === "string" && value.trim() === "") return false;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0;
}

/** Format d'heure "HH:MM" (0-23 h, 0-59 min). */
const HEURE_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Valide le body d'un événement (création ou modification).
 * @param body objet JSON reçu (`req.body`)
 * @returns liste des messages d'erreur ; vide si les données sont valides.
 */
export function validateEventInput(body: Record<string, unknown>): string[] {
  const erreurs: string[] = [];

  const titre = body.titre;
  if (!isNonEmptyString(titre) || titre.trim().length < 3) {
    erreurs.push("Le titre est obligatoire (au moins 3 caractères).");
  }

  const date = body.date;
  if (typeof date !== "string" || Number.isNaN(Date.parse(date))) {
    erreurs.push("La date est obligatoire et doit être une date valide.");
  }

  const heure = body.heure;
  if (!isNonEmptyString(heure) || !HEURE_REGEX.test(heure.trim())) {
    erreurs.push("L'heure est obligatoire (format HH:MM, ex: 15:30).");
  }

  const lieu = body.lieu;
  if (!isNonEmptyString(lieu)) {
    erreurs.push("Le lieu est obligatoire.");
  }

  const type = body.type;
  if (type === undefined || type === null || (typeof type === "string" && type.trim() === "")) {
    erreurs.push("Le type d'événement est obligatoire : MATCH ou ENTRAINEMENT.");
  } else if (type !== "MATCH" && type !== "ENTRAINEMENT") {
    erreurs.push("Le type d'événement doit être MATCH ou ENTRAINEMENT.");
  }

  const categorieId = body.categorieId;
  if (!isPositiveInteger(categorieId)) {
    erreurs.push("La catégorie est obligatoire (identifiant entier positif).");
  }

  // ---- Champs optionnels (vérifiés uniquement s'ils sont renseignés) ----
  const equipeA = body.equipeA;
  if (equipeA !== undefined && equipeA !== null && !isNonEmptyString(equipeA)) {
    erreurs.push("L'équipe A doit être une chaîne non vide si elle est renseignée.");
  }

  const equipeB = body.equipeB;
  if (equipeB !== undefined && equipeB !== null && !isNonEmptyString(equipeB)) {
    erreurs.push("L'équipe B doit être une chaîne non vide si elle est renseignée.");
  }

  const typeMatch = body.typeMatch;
  if (
    typeMatch !== undefined &&
    typeMatch !== null &&
    typeMatch !== "AMICAL" &&
    typeMatch !== "CHAMPIONNAT"
  ) {
    erreurs.push("typeMatch doit être AMICAL ou CHAMPIONNAT si renseigné.");
  }

  const scoreA = body.scoreA;
  if (scoreA !== undefined && scoreA !== null && !isNonNegativeInteger(scoreA)) {
    erreurs.push("Le score A doit être un entier positif ou nul si renseigné.");
  }

  const scoreB = body.scoreB;
  if (scoreB !== undefined && scoreB !== null && !isNonNegativeInteger(scoreB)) {
    erreurs.push("Le score B doit être un entier positif ou nul si renseigné.");
  }

  const duree = body.duree;
  if (duree !== undefined && duree !== null && !isPositiveInteger(duree)) {
    erreurs.push("La durée doit être un entier positif (minutes) si renseignée.");
  }

  const objectif = body.objectif;
  if (objectif !== undefined && objectif !== null && !isNonEmptyString(objectif)) {
    erreurs.push("L'objectif doit être une chaîne non vide si renseigné.");
  }

  return erreurs;
}
