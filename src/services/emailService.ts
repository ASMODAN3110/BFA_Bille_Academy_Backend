// Service email Module 3 — BFA Bille Football Academy
// BEST-EFFORT : sans `EMAIL_ENABLED=1` + `SMTP_HOST` configurés, les emails sont loggés
// en console (`[EMAIL DEV]`) au lieu d'être envoyés. Un échec d'envoi est loggé mais ne
// rejette JAMAIS la promesse : la réponse HTTP n'est jamais bloquée. Le module fonctionne
// donc sans aucune infrastructure email en dev (comme le bucket S3 auto-créé).

import nodemailer, { type Transporter } from "nodemailer";
import type { DemandeEssai } from "../../generated/prisma/client";
import {
  templateAccuseReception,
  templateConfirmationDevis,
  templateConfirmationEssai,
  templateNotificationDevis,
  templateRefusEssai,
  type DevisAvecProduit,
} from "../templates/emailTemplates";

/** Vrai si l'envoi réel d'emails est activé (EMAIL_ENABLED=1 + SMTP_HOST renseigné). */
function emailConfigure(): boolean {
  return process.env.EMAIL_ENABLED === "1" && Boolean(process.env.SMTP_HOST);
}

/** Transporteur nodemailer, créé paresseusement au premier envoi réel. */
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Envoie un email — ou le logge en console en mode dev. Ne rejette jamais.
 * @param to destinataire (email du demandeur)
 * @param subject sujet de l'email
 * @param html contenu HTML de l'email
 */
async function envoyerEmail(to: string, subject: string, html: string): Promise<void> {
  if (!emailConfigure()) {
    console.log("[EMAIL DEV]", { to, subject });
    return;
  }
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM ?? "BFA Bille Football Academy <no-reply@bfa-academy.com>",
      to,
      subject,
      html,
    });
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
