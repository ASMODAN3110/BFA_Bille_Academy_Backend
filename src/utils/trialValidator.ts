// Validateur des champs d'une demande d'essai — BFA Bille Football Academy
// Style de `src/utils/eventValidator.ts` : fonctions simples, aucune dépendance.
// `validateTrialInput` renvoie une liste de messages d'erreur (vide = données valides).
//
// NB : la cohérence catégorie/âge (l'âge doit être couvert par une catégorie existante,
// ageMin ≤ âge ≤ ageMax) est une RÈGLE MÉTIER vérifiée dans `src/services/trialService.ts`,
// pas ici — comme la cohérence type/champs des événements (eventService.ts).

import { isValidEmail } from "./validators";

/** Vrai si `value` est une chaîne non vide après suppression des espaces. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Valide le body d'une demande d'essai (création publique, @EF15/@EF16/@EF17).
 * @param body objet JSON reçu (`req.body`)
 * @returns liste des messages d'erreur ; vide si les données sont valides.
 */
export function validateTrialInput(body: Record<string, unknown>): string[] {
  const erreurs: string[] = [];

  const nomJoueur = body.nomJoueur;
  if (!isNonEmptyString(nomJoueur)) {
    erreurs.push("Le nom du joueur est obligatoire.");
  }

  const prenomJoueur = body.prenomJoueur;
  if (!isNonEmptyString(prenomJoueur)) {
    erreurs.push("Le prénom du joueur est obligatoire.");
  }

  // Âge : entier compris entre 9 et 17 ans (bornes académie).
  const age = Number(body.age);
  if (!Number.isInteger(age) || age < 9 || age > 17) {
    erreurs.push("L'âge doit être un entier entre 9 et 17 ans.");
  }

  const telephone = body.telephone;
  if (!isNonEmptyString(telephone)) {
    erreurs.push("Le téléphone est obligatoire.");
  }

  const email = body.email;
  if (!isValidEmail(email)) {
    erreurs.push("L'adresse email est invalide.");
  }

  // Date d'essai : date valide, strictement dans le futur.
  const dateEssai = body.dateEssai;
  if (typeof dateEssai !== "string" || Number.isNaN(Date.parse(dateEssai)) || new Date(dateEssai) <= new Date()) {
    erreurs.push("La date d'essai est obligatoire et doit être dans le futur.");
  }

  // ---- Champs optionnels (vérifiés uniquement s'ils sont renseignés) ----
  const message = body.message;
  if (message !== undefined && message !== null && !isNonEmptyString(message)) {
    erreurs.push("Le message doit être une chaîne non vide si renseigné.");
  }

  return erreurs;
}

/**
 * Valide le body d'un refus de demande (@EF19) : le motif est obligatoire.
 * @param body objet JSON reçu (`req.body`)
 * @returns liste des messages d'erreur ; vide si les données sont valides.
 */
export function validateRefusInput(body: Record<string, unknown>): string[] {
  const erreurs: string[] = [];
  if (!isNonEmptyString(body.motifRefus)) {
    erreurs.push("Le motif de refus est obligatoire.");
  }
  return erreurs;
}
