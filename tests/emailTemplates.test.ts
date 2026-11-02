import { describe, it, expect } from 'vitest'
import {
  templateAccuseReception,
  templateConfirmationEssai,
  templateRefusEssai,
  templateConfirmationDevis,
  templateNotificationDevis,
} from '../src/templates/emailTemplates'

const demande = {
  id: 1, nomJoueur: 'Dupont', prenomJoueur: 'Jean', age: 12,
  telephone: '+237690000000', email: 'jean@test.com',
  dateEssai: new Date('2026-10-15'), message: null, motifRefus: 'Trop jeune',
  statut: 'EN_ATTENTE' as const, dateSoumission: new Date(), administrateurId: null,
} as any

const devis = {
  id: 1, nomComplet: 'Jean Dupont', email: 'jean@test.com',
  telephone: '+237690000000',
  message: 'Urgent', estTraite: false, dateDemande: new Date(), administrateurId: null,
  lignes: [{ id: 1, devisId: 1, produitId: 1, produitNom: 'Maillot BFA', quantite: 2, taille: 'M' }],
} as any

/** Devis de 3 articles (dont un nom contenant du HTML, à échapper). */
const devisMulti = {
  ...devis,
  lignes: [
    { id: 1, devisId: 1, produitId: 1, produitNom: 'Maillot BFA', quantite: 14, taille: 'M' },
    { id: 2, devisId: 1, produitId: 2, produitNom: 'Short <b>BFA</b>', quantite: 14, taille: 'L' },
    { id: 3, devisId: 1, produitId: 3, produitNom: 'Ballon BFA', quantite: 3, taille: null },
  ],
} as any

describe('emailTemplates — templateAccuseReception', () => {
  it('retourne un objet avec subject et html', () => {
    const { subject, html } = templateAccuseReception(demande)
    expect(subject).toContain('reçue')
    expect(html).toContain('Jean Dupont')
    expect(html).toContain('BFA Bille Football Academy')
    expect(html).toContain('html')
  })

  it('inclut la date formatée', () => {
    const { html } = templateAccuseReception(demande)
    expect(html).toContain('15/10/2026')
  })
})

describe('emailTemplates — templateConfirmationEssai', () => {
  it('retourne confirmation avec félicitations', () => {
    const { subject, html } = templateConfirmationEssai(demande)
    expect(subject).toContain('confirmé')
    expect(html).toContain('Félicitations')
    expect(html).toContain('Jean Dupont')
  })

  it('inclut les instructions de présentation', () => {
    const { html } = templateConfirmationEssai(demande)
    expect(html).toContain('30 minutes')
  })
})

describe('emailTemplates — templateRefusEssai', () => {
  it('retourne un email de refus', () => {
    const { subject, html } = templateRefusEssai(demande)
    expect(subject).toContain('Réponse')
    expect(html).toContain('Jean Dupont')
    expect(html).toContain('Trop jeune')
  })

  it('affiche "Non précisé" si motifRefus est null', () => {
    const d = { ...demande, motifRefus: null }
    const { html } = templateRefusEssai(d)
    expect(html).toContain('Non précisé')
  })
})

describe('emailTemplates — templateConfirmationDevis', () => {
  it('retourne la confirmation avec produit, taille et quantité', () => {
    const { subject, html } = templateConfirmationDevis(devis)
    expect(subject).toContain('devis')
    expect(html).toContain('Maillot BFA')
    expect(html).toContain('taille M')
    expect(html).toContain('quantité : 2')
    expect(html).toContain('Jean Dupont')
  })

  it('liste tous les articles d\'un devis à plusieurs lignes', () => {
    const { html } = templateConfirmationDevis(devisMulti)
    expect(html).toContain('les 3 articles')
    expect(html).toContain('Maillot BFA')
    expect(html).toContain('Ballon BFA')
    expect((html.match(/<li>/g) ?? []).length).toBe(3)
  })

  it('échappe le HTML dans le nom d\'un produit', () => {
    const { html } = templateConfirmationDevis(devisMulti)
    expect(html).not.toContain('<b>BFA</b>')
    expect(html).toContain('Short &lt;b&gt;BFA&lt;/b&gt;')
  })

  it('inclut le numéro de téléphone', () => {
    const { html } = templateConfirmationDevis(devis)
    expect(html).toContain('+237690000000')
  })
})

describe('emailTemplates — templateNotificationDevis', () => {
  it('retourne la notification avec le produit', () => {
    const { subject, html } = templateNotificationDevis(devis)
    expect(subject).toContain('Maillot BFA')
    expect(html).toContain('Maillot BFA')
    expect(html).toContain('quantité : 2')
    expect(html).toContain('taille M')
  })

  it('résume le nombre d\'articles dans le sujet pour un devis à plusieurs lignes', () => {
    const { subject, html } = templateNotificationDevis(devisMulti)
    expect(subject).toContain('3 articles')
    expect(html).toContain('3 articles')
    expect(html).toContain('Ballon BFA — quantité : 3')
  })

  it('affiche "—" si le message est null', () => {
    const d = { ...devis, message: null }
    const { html } = templateNotificationDevis(d)
    expect(html).toContain('—')
  })
})
