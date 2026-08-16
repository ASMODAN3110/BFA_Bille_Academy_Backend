// Service Module 1 — Règles métier des joueurs — BFA Bille Football Academy
// Le service renvoie un résultat `{ ok, message? }` et ne lève JAMAIS d'erreur HTTP :
// le contrôleur traduit le résultat en statut (400/404).
// Âge calculé depuis `dateNaissance` ; tranche `[ageMin, ageMax]` lue en base (jamais codée en dur).

import { calculateAge } from "../utils/dateUtils";

/** Âge minimal pour intégrer l'académie (@EF5). */
export const AGE_MINIMUM = 9;
/** Âge maximal pour intégrer l'académie (@EF5). */
export const AGE_MAXIMUM = 17;

/** Résultat d'une règle métier : `ok` = règle respectée, sinon un message d'erreur. */
export interface Verdict {
  ok: boolean;
  message?: string;
}

/** Sous-ensemble de `Categorie` requis pour la vérification d'âge (@EF4). */
export interface CategorieAge {
  ageMin: number;
  ageMax: number;
}

/**
 * Vérifie l'âge minimal (et maximal) du joueur (@EF5).
 * @param dateNaissance date de naissance du joueur
 */
export function verifierAgeMinimum(dateNaissance: Date): Verdict {
  const age = calculateAge(dateNaissance);

  if (age < AGE_MINIMUM) {
    return { ok: false, message: "L'âge minimum pour intégrer l'académie est de 9 ans." };
  }
  if (age > AGE_MAXIMUM) {
    return { ok: false, message: "L'âge maximum pour intégrer l'académie est de 17 ans." };
  }
  return { ok: true };
}

/**
 * Vérifie que l'âge du joueur est dans la tranche `[ageMin, ageMax]` de la catégorie (@EF4).
 * @param dateNaissance date de naissance du joueur
 * @param categorie catégorie cible (ageMin / ageMax lus en base)
 */
export function verifierAgeEtCategorie(dateNaissance: Date, categorie: CategorieAge): Verdict {
  const age = calculateAge(dateNaissance);

  if (age < categorie.ageMin || age > categorie.ageMax) {
    return {
      ok: false,
      message: "L'âge du joueur ne correspond pas à la catégorie sélectionnée.",
    };
  }
  return { ok: true };
}
