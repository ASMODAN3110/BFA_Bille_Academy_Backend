// Modèles d'emails du Module 3 — BFA Bille Football Academy
// Emails HTML simples (styles inline) envoyés au demandeur d'essai : accusé de
// réception, confirmation, refus. Utilisés par `src/services/emailService.ts`.

import type { DemandeEssai, Prisma } from "../../generated/prisma/client";

/** Devis avec son produit, renvoyé par `quoteService` et consommé par les templates. */
export type DevisAvecProduit = Prisma.DevisGetPayload<{ include: { produit: true } }>;

/** Date d'essai formatée en français (ex: 27/08/2026). */
function dateFr(date: Date): string {
  return date.toLocaleDateString("fr-FR");
}

/** Nom complet du joueur (prénom nom). */
function nomComplet(demande: DemandeEssai): string {
  return `${demande.prenomJoueur} ${demande.nomJoueur}`;
}

/** Coquille HTML minimale avec styles inline. */
function html(titre: string, corps: string): string {
  return `
<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:8px;overflow:hidden;">
      <div style="background:#10b981;padding:20px 24px;color:#ffffff;">
        <h1 style="margin:0;font-size:18px;">BFA Bille Football Academy</h1>
      </div>
      <div style="padding:24px;">
        <h2 style="margin:0 0 12px;font-size:16px;">${titre}</h2>
        ${corps}
        <p style="margin-top:24px;font-size:13px;color:#6b7280;">
          BFA Bille Football Academy — Douala, Cameroun
        </p>
      </div>
    </div>
  </body>
</html>`;
}

/** Email d'accusé de réception, envoyé dès la création de la demande (@EF15). */
export function templateAccuseReception(demande: DemandeEssai): { subject: string; html: string } {
  const subject = "BFA Bille Academy — Demande d'essai reçue";
  const corps = `
    <p>Bonjour ${nomComplet(demande)},</p>
    <p>Nous avons bien reçu votre demande de rendez-vous pour un essai prévu le
       <strong>${dateFr(demande.dateEssai)}</strong>.</p>
    <p>Notre équipe reviendra vers vous rapidement pour confirmer votre créneau.</p>`;
  return { subject, html: html(subject, corps) };
}

/** Email de confirmation, envoyé quand l'administrateur valide la demande (@EF18). */
export function templateConfirmationEssai(demande: DemandeEssai): { subject: string; html: string } {
  const subject = "BFA Bille Academy — Essai confirmé";
  const corps = `
    <p>Félicitations ${nomComplet(demande)},</p>
    <p>Votre essai est <strong>confirmé</strong> pour le <strong>${dateFr(demande.dateEssai)}</strong>.</p>
    <p>Présentez-vous sur le terrain de l'académie en tenue de sport, 30 minutes avant l'heure
       du rendez-vous.</p>
    <p>Nous avons hâte de vous voir jouer !</p>`;
  return { subject, html: html(subject, corps) };
}

/** Email de refus, envoyé quand l'administrateur refuse la demande (@EF19). */
export function templateRefusEssai(demande: DemandeEssai): { subject: string; html: string } {
  const subject = "BFA Bille Academy — Réponse à votre demande d'essai";
  const corps = `
    <p>Bonjour ${nomComplet(demande)},</p>
    <p>Nous vous remercions pour votre demande d'essai. Après examen, nous ne sommes
       malheureusement pas en mesure de donner suite à votre candidature.</p>
    <p><strong>Motif :</strong> ${demande.motifRefus ?? "Non précisé."}</p>
    <p>Nous vous encourageons à retenter votre chance à la prochaine session de détection.</p>`;
  return { subject, html: html(subject, corps) };
}

// =====================================================================
// Module 8 — Boutique : emails des demandes de devis (@EF42)
// =====================================================================

/** Confirmation envoyée au client (@EF42). */
export function templateConfirmationDevis(devis: DevisAvecProduit): { subject: string; html: string } {
  const subject = "BFA Bille Academy — Demande de devis reçue";
  const corps = `
    <p>Bonjour ${devis.nomComplet},</p>
    <p>Votre demande de devis pour le produit <strong>${devis.produit.nom}</strong>
       (quantité : ${devis.quantite}) a bien été prise en compte.</p>
    <p>Notre équipe vous contactera très rapidement au <strong>${devis.telephone}</strong>
       pour finaliser votre commande.</p>
    <p>Merci pour votre confiance !</p>`;
  return { subject, html: html(subject, corps) };
}

/** Notification à l'académie (@EF42). Destinataire : contact@bfa-bille-academy.com. */
export function templateNotificationDevis(devis: DevisAvecProduit): { subject: string; html: string } {
  const subject = `BFA Bille Academy — Nouvelle demande de devis : ${devis.produit.nom}`;
  const corps = `
    <p>Une nouvelle demande de devis vient d'être soumise sur la boutique :</p>
    <ul>
      <li><strong>Produit :</strong> ${devis.produit.nom}</li>
      <li><strong>Quantité :</strong> ${devis.quantite}</li>
      <li><strong>Taille :</strong> ${devis.taille ?? "—"}</li>
      <li><strong>Client :</strong> ${devis.nomComplet} (${devis.email})</li>
      <li><strong>Téléphone :</strong> ${devis.telephone}</li>
      <li><strong>Message :</strong> ${devis.message ?? "—"}</li>
    </ul>
    <p>Répondez au client pour finaliser la demande.</p>`;
  return { subject, html: html(subject, corps) };
}
