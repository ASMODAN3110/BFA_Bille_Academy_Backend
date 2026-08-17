// Validateur des champs d'une fiche technique — BFA Bille Football Academy
// Style de `src/utils/albumValidator.ts` : fonctions simples, aucune dépendance.
// `validateTeamSheetCreate` / `validateTeamSheetUpdate` renvoient une liste de
// messages d'erreur en français (vide = données valides).
//
// Saison : format `AAAA-AAAA` (tiret), cohérent avec le seed (ex : "2025-2026").
// Le format à barre oblique `2024/2025` est rejeté.

/** Regex de la saison : "2025-2026" (tiret, pas de slash). */
export const REGEX_SAISON = /^\d{4}-\d{4}$/;

/**
 * Vérifie qu'un champ texte optionnel (`staff`, `palmares`, `objectifs`) est une
 * chaîne de caractères lorsqu'il est renseigné. `null`/`undefined`/`""` sont acceptés.
 */
function validerTexteOptionnel(
  body: Record<string, unknown>,
  champ: string,
  erreurs: string[]
): void {
  const valeur = body[champ];
  if (valeur !== undefined && valeur !== null && typeof valeur !== "string") {
    erreurs.push(`Le champ « ${champ} » doit être une chaîne de caractères si renseigné.`);
  }
}

/**
 * Valide le body d'une création de fiche technique (POST @EF27).
 * @param body objet JSON reçu (`req.body`)
 * @returns liste des messages d'erreur ; vide si les données sont valides.
 */
export function validateTeamSheetCreate(body: Record<string, unknown>): string[] {
  const erreurs: string[] = [];

  const categorieId = body.categorieId;
  if (typeof categorieId !== "number" || !Number.isInteger(categorieId) || categorieId <= 0) {
    erreurs.push("L'identifiant de la catégorie est obligatoire (entier positif).");
  }

  validerTexteOptionnel(body, "staff", erreurs);
  validerTexteOptionnel(body, "palmares", erreurs);
  validerTexteOptionnel(body, "objectifs", erreurs);

  const saison = body.saison;
  if (typeof saison !== "string" || !REGEX_SAISON.test(saison.trim())) {
    erreurs.push("La saison est obligatoire au format AAAA-AAAA (ex : 2025-2026).");
  }

  return erreurs;
}

/**
 * Valide le body d'une mise à jour de fiche technique (PUT / PATCH @EF27/@EF28).
 * @param body    objet JSON reçu (`req.body`)
 * @param partiel `false` (PUT, remplacement complet) : la saison est obligatoire.
 *                `true` (PATCH, partiel) : seuls les champs fournis sont validés.
 * @returns liste des messages d'erreur ; vide si les données sont valides.
 */
export function validateTeamSheetUpdate(body: Record<string, unknown>, partiel: boolean): string[] {
  const erreurs: string[] = [];

  if (!partiel || body.staff !== undefined) validerTexteOptionnel(body, "staff", erreurs);
  if (!partiel || body.palmares !== undefined) validerTexteOptionnel(body, "palmares", erreurs);
  if (!partiel || body.objectifs !== undefined) validerTexteOptionnel(body, "objectifs", erreurs);

  if (partiel && body.saison === undefined) return erreurs;

  const saison = body.saison;
  if (typeof saison !== "string" || !REGEX_SAISON.test(saison.trim())) {
    erreurs.push("La saison est obligatoire au format AAAA-AAAA (ex : 2025-2026).");
  }

  return erreurs;
}
