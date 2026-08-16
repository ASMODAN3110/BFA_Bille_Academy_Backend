// Utilitaires de dates — BFA Bille Football Academy
// `calculateAge` : âge en années révolues à partir de la date de naissance
// (anniversaire non encore franchi → on soustrait 1 an).

/**
 * Âge en années révolues d'une personne à une date donnée (aujourd'hui par défaut).
 * @param dateNaissance date de naissance
 * @param aujourdHui date de référence (testabilité) — par défaut `new Date()`
 */
export function calculateAge(dateNaissance: Date, aujourdHui: Date = new Date()): number {
  let age = aujourdHui.getFullYear() - dateNaissance.getFullYear();

  const anniversairePasse =
    aujourdHui.getMonth() > dateNaissance.getMonth() ||
    (aujourdHui.getMonth() === dateNaissance.getMonth() &&
      aujourdHui.getDate() >= dateNaissance.getDate());

  if (!anniversairePasse) age -= 1;
  return age;
}
