import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockSendMail } = vi.hoisted(() => ({
  mockSendMail: vi.fn().mockResolvedValue({ messageId: 'test' }),
}))

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({ sendMail: mockSendMail }),
  },
}))

import {
  envoyerAccuseReception,
  envoyerConfirmationEssai,
  envoyerRefusEssai,
  envoyerConfirmationDevis,
  envoyerNotificationDevis,
} from '../src/services/emailService'

const demande = {
  id: 1, nomJoueur: 'Dupont', prenomJoueur: 'Jean', age: 12,
  telephone: '+237690000000', email: 'jean@test.com',
  dateEssai: new Date('2026-10-15'), message: null, motifRefus: null,
  statut: 'EN_ATTENTE' as const, dateSoumission: new Date(), administrateurId: null,
} as any

const devis = {
  id: 1, nomComplet: 'Jean Dupont', email: 'jean@test.com',
  telephone: '+237690000000', produitId: 1, quantite: 2, taille: 'M',
  message: null, estTraite: false, dateDemande: new Date(), administrateurId: null,
  produit: { id: 1, nom: 'Maillot BFA' },
} as any

describe('emailService — mode dev (pas de EMAIL_ENABLED)', () => {
  const oldEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...oldEnv, EMAIL_ENABLED: '0', SMTP_HOST: '' }
  })
  afterEach(() => { process.env = oldEnv })

  it('envoyerAccuseReception ne rejette pas (no-op en dev)', async () => {
    await expect(envoyerAccuseReception(demande)).resolves.toBeUndefined()
    expect(mockSendMail).not.toHaveBeenCalled()
  })

  it('envoyerConfirmationEssai ne rejette pas', async () => {
    await expect(envoyerConfirmationEssai(demande)).resolves.toBeUndefined()
  })

  it('envoyerRefusEssai ne rejette pas', async () => {
    await expect(envoyerRefusEssai(demande)).resolves.toBeUndefined()
  })

  it('envoyerConfirmationDevis ne rejette pas', async () => {
    await expect(envoyerConfirmationDevis(devis)).resolves.toBeUndefined()
  })

  it('envoyerNotificationDevis ne rejette pas', async () => {
    await expect(envoyerNotificationDevis(devis)).resolves.toBeUndefined()
  })
})

describe('emailService — mode prod (EMAIL_ENABLED=1 + SMTP)', () => {
  const oldEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...oldEnv,
      EMAIL_ENABLED: '1',
      SMTP_HOST: 'smtp.test.com',
      SMTP_PORT: '587',
      SMTP_USER: 'user@test.com',
      SMTP_PASS: 'pass',
    }
  })
  afterEach(() => { process.env = oldEnv })

  it('envoyerAccuseReception appelle sendMail', async () => {
    await envoyerAccuseReception(demande)
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jean@test.com',
        subject: expect.stringContaining('reçue'),
      }),
    )
  })

  it('envoyerConfirmationEssai appelle sendMail', async () => {
    await envoyerConfirmationEssai(demande)
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'jean@test.com', subject: expect.stringContaining('confirmé') }),
    )
  })

  it('envoyerRefusEssai appelle sendMail', async () => {
    await envoyerRefusEssai(demande)
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'jean@test.com' }),
    )
  })

  it('envoyerConfirmationDevis appelle sendMail', async () => {
    await envoyerConfirmationDevis(devis)
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'jean@test.com', subject: expect.stringContaining('devis') }),
    )
  })

  it('envoyerNotificationDevis utilise ACADEMY_EMAIL', async () => {
    process.env.ACADEMY_EMAIL = 'academy@test.com'
    await envoyerNotificationDevis(devis)
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'academy@test.com' }),
    )
  })

  it('gère un échec d\'envoi sans rejeter', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP error'))
    await expect(envoyerAccuseReception(demande)).resolves.toBeUndefined()
  })
})
