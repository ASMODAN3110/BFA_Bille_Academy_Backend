// Validateurs de champs — BFA Bille Football Academy
// Fonctions de validation réutilisables (login, formulaires du back-office, ...).

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Vrai si `value` est une chaîne ressemblant à un email valide. */
export function isValidEmail(value: unknown): boolean {
  return typeof value === "string" && EMAIL_REGEX.test(value.trim());
}

/** Vrai si `value` est une chaîne non vide (après suppression des espaces). */
export function isValidPassword(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
