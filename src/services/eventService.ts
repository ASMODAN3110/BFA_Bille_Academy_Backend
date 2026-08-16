// Service Module 2 — Règles métier des événements — BFA Bille Football Academy
// Le service renvoie un résultat `{ ok, message? }` et ne lève JAMAIS d'erreur HTTP :
// le contrôleur traduit le résultat en statut (400/404).

/** Type d'un événement (enum Prisma `TypeEvenement`). */
export type TypeEvenement = "MATCH" | "ENTRAINEMENT";

/** Résultat d'une règle métier : `ok` = règle respectée, sinon un message d'erreur. */
export interface Verdict {
  ok: boolean;
  message?: string;
}

/** Fenêtre temporelle (UTC) couvrant un mois calendaire complet. */
export interface FenetreMois {
  gte: Date;
  lt: Date;
}

/** Vrai si `value` est une chaîne non vide après suppression des espaces. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Vérifie la cohérence des champs spécifiques avec le type de l'événement.
 * - MATCH : les deux équipes sont obligatoires (un match sans équipe n'a pas de sens) ;
 *   `typeMatch`/`scoreA`/`scoreB` restent optionnels.
 * - ENTRAINEMENT : `objectif`/`duree` sont optionnels — aucune contrainte supplémentaire.
 * @param type type validé de l'événement (MATCH ou ENTRAINEMENT)
 * @param body objet JSON reçu (`req.body` ou fusion pour l'update)
 */
export function verifierChampsParType(type: TypeEvenement, body: Record<string, unknown>): Verdict {
  if (type === "MATCH") {
    const equipeA = body.equipeA;
    const equipeB = body.equipeB;
    if (!isNonEmptyString(equipeA) || !isNonEmptyString(equipeB)) {
      return {
        ok: false,
        message: "Un événement de type MATCH doit renseigner l'équipe A et l'équipe B.",
      };
    }
  }
  return { ok: true };
}

/**
 * Calcule la fenêtre UTC `[1er jour du mois, 1er jour du mois suivant)` pour `month` ("YYYY-MM").
 * La borne supérieure est exclusive (`lt`) : un événement du 31 tombe toujours dans son mois,
 * quel que soit le nombre de jours — jamais de borne « mois-31 ».
 * @param month mois au format "YYYY-MM" (le contrôleur valide le format avant l'appel)
 */
export function calculerFenetreMois(month: string): FenetreMois {
  const [annee, mois] = month.split("-").map(Number);
  return {
    gte: new Date(Date.UTC(annee, mois - 1, 1)),
    lt: new Date(Date.UTC(annee, mois, 1)),
  };
}
