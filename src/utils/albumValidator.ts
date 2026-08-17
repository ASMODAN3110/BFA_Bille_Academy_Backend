// Validateur des champs d'un album — BFA Bille Football Academy
// Style de `src/utils/eventValidator.ts` : fonctions simples, aucune dépendance.
// `validateAlbumInput` renvoie une liste de messages d'erreur (vide = données valides).
//
// La liste des thèmes (@EF21) est exportée ici : elle sert à la fois à la validation
// du body (création/modification) et au filtre `?theme=` du contrôleur de liste.

/** Liste fixe des thèmes d'un album (@EF21). */
export const THEMES_ALBUM = ["Entraînements", "Matchs", "Événements", "Portraits"] as const;

export type ThemeAlbum = (typeof THEMES_ALBUM)[number];

/**
 * Valide le body d'un album (création @EF22 / modification).
 * @param body objet JSON reçu (`req.body`)
 * @returns liste des messages d'erreur ; vide si les données sont valides.
 */
export function validateAlbumInput(body: Record<string, unknown>): string[] {
  const erreurs: string[] = [];

  const titre = body.titre;
  if (typeof titre !== "string" || titre.trim().length < 3) {
    erreurs.push("Le titre de l'album est obligatoire (3 caractères minimum).");
  }

  const description = body.description;
  if (description !== undefined && description !== null && typeof description !== "string") {
    erreurs.push("La description doit être une chaîne non vide si renseignée.");
  }

  const theme = body.theme;
  if (typeof theme !== "string" || !(THEMES_ALBUM as readonly string[]).includes(theme)) {
    erreurs.push("Le thème doit être l'un des suivants : Entraînements, Matchs, Événements, Portraits.");
  }

  return erreurs;
}
