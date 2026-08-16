// Validateurs de champs — BFA Bille Football Academy
// Fonctions de validation réutilisables (login, formulaires du back-office, ...).

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Vrai si `value` est une chaîne ressemblant à un email valide (garde de type). */
export function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && EMAIL_REGEX.test(value.trim());
}

/** Vrai si `value` est une chaîne non vide (après suppression des espaces) — garde de type. */
export function isValidPassword(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
