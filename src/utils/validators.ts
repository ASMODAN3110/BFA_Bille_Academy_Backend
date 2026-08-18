// Validateurs de champs — BFA Bille Football Academy
// Fonctions de validation réutilisables (login, formulaires du back-office, ...).

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Longueur minimale d'un mot de passe à la création / au changement (module 10). */
export const MIN_PASSWORD_LENGTH = 6;

/** Vrai si `value` est une chaîne ressemblant à un email valide (garde de type). */
export function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && EMAIL_REGEX.test(value.trim());
}

/** Vrai si `value` est une chaîne non vide (après suppression des espaces) — garde de type. */
export function isValidPassword(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Vrai si `value` est un nom d'administrateur non vide — garde de type. */
export function isValidNom(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Vrai si `value` est un mot de passe satisfaisant la politique (≥ 6 caractères) — garde de type. */
export function isValidNewPassword(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= MIN_PASSWORD_LENGTH;
}
