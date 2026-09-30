// Service email Module 3 — BFA Bille Football Academy
// Envoi via l'API Resend (https://resend.com) — HTTPS, pas de SMTP.
// BEST-EFFORT : sans `EMAIL_ENABLED=1` + `RESEND_API_KEY` configurés, les emails sont
// ignorés silencieusement (mode dev). Un échec d'envoi est loggé mais ne rejette JAMAIS
// la promesse : la réponse HTTP n'est jamais bloquée.

import { Resend } from "resend";
import type { DemandeEssai } from "../../generated/prisma/client";
import {
  templateAccuseReception,
  templateConfirmationDevis,
  templateConfirmationEssai,
  templateNotificationDevis,
  templateRefusEssai,
  type DevisAvecProduit,
} from "../templates/emailTemplates";

/** Vrai si l'envoi réel d'emails est activé (EMAIL_ENABLED=1 + RESEND_API_KEY renseignée). */
function emailConfigure(): boolean {
  return process.env.EMAIL_ENABLED === "1" && Boolean(process.env.RESEND_API_KEY);
}

/** Client Resend, créé paresseusement au premier envoi réel. */
let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

/**
 * Envoie un email via Resend — ou l'ignore en mode dev. Ne rejette jamais.
 * NB : `emails.send()` ne lève pas d'exception sur une erreur API, il retourne
 * `{ data, error }` — il faut donc tester `error` explicitement.
 * @param to destinataire
 * @param subject sujet de l'email
 * @param html contenu HTML de l'email
 */
async function envoyerEmail(to: string, subject: string, html: string): Promise<void> {
  if (!emailConfigure()) {
    return;
  }
  try {
    const { error } = await getResend().emails.send({
      from:
        process.env.EMAIL_FROM ??
        "BFA Bille Football Academy <no-reply@bille-football-academy.com>",
      to,
      subject,
      html,
    });
    if (error) {
      console.error("[EMAIL] Échec de l'envoi :", error);
    }
  } catch (err) {
    console.error("[EMAIL] Échec de l'envoi :", err);
  }
}

/** Accusé de réception, envoyé dès la création d'une demande d'essai (@EF15). */
export async function envoyerAccuseReception(demande: DemandeEssai): Promise<void> {
  const { subject, html } = templateAccuseReception(demande);
  await envoyerEmail(demande.email, subject, html);
}

/** Confirmation d'essai, envoyée quand l'administrateur valide la demande (@EF18). */
export async function envoyerConfirmationEssai(demande: DemandeEssai): Promise<void> {
  const { subject, html } = templateConfirmationEssai(demande);
  await envoyerEmail(demande.email, subject, html);
}

/** Refus d'essai, envoyé quand l'administrateur refuse la demande (@EF19). */
export async function envoyerRefusEssai(demande: DemandeEssai): Promise<void> {
  const { subject, html } = templateRefusEssai(demande);
  await envoyerEmail(demande.email, subject, html);
}

// ---- Module 8 : Demandes de devis (@EF42) ----

/** Confirmation au client, envoyée à la création d'un devis (@EF42). */
export async function envoyerConfirmationDevis(devis: DevisAvecProduit): Promise<void> {
  const { subject, html } = templateConfirmationDevis(devis);
  await envoyerEmail(devis.email, subject, html);
}

/** Notification à l'académie, envoyée à la création d'un devis (@EF42). */
export async function envoyerNotificationDevis(devis: DevisAvecProduit): Promise<void> {
  const { subject, html } = templateNotificationDevis(devis);
  await envoyerEmail(
    process.env.ACADEMY_EMAIL ?? "contact@bfa-bille-academy.com",
    subject,
    html,
  );
}
