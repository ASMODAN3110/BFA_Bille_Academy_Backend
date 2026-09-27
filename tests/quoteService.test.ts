import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPrisma, mockEnvoyerConfirmation, mockEnvoyerNotification } = vi.hoisted(() => ({
  mockPrisma: {
    produit: { findUnique: vi.fn() },
    devis: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
  mockEnvoyerConfirmation: vi.fn().mockResolvedValue(undefined),
  mockEnvoyerNotification: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../src/config/database', () => ({ default: mockPrisma }))
vi.mock('../src/services/emailService', () => ({
  envoyerConfirmationDevis: mockEnvoyerConfirmation,
  envoyerNotificationDevis: mockEnvoyerNotification,
}))

import { creerDevis, listerDevis, obtenirDevis, marquerDevisTraite } from '../src/services/quoteService'

const produit = { id: 1, nom: 'Maillot BFA' }
const devisFixture = {
  id: 1, nomComplet: 'Jean Dupont', email: 'jean@test.com',
  telephone: '+237690000000', produitId: 1, quantite: 2, taille: 'M',
  message: null, estTraite: false, dateDemande: new Date(), administrateurId: null,
  produit,
}

describe('quoteService — creerDevis', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne PRODUIT_INTROUVABLE si le produit n\'existe pas', async () => {
    mockPrisma.produit.findUnique.mockResolvedValue(null)
    const result = await creerDevis({ produitId: 999, nomComplet: 'X', email: 'x@t.com', telephone: '12345678', quantite: 1 })
    expect(result.ok).toBe(false)
    expect(result.code).toBe('PRODUIT_INTROUVABLE')
  })

  it('crée le devis et envoie les emails', async () => {
    mockPrisma.produit.findUnique.mockResolvedValue(produit)
    mockPrisma.devis.create.mockResolvedValue(devisFixture)
    const result = await creerDevis({
      nomComplet: 'Jean Dupont', email: 'jean@test.com',
      telephone: '+237690000000', produitId: 1, quantite: 2, taille: 'M',
    })
    expect(result.ok).toBe(true)
    expect(result.data).toBe(devisFixture)
    expect(mockEnvoyerConfirmation).toHaveBeenCalledWith(devisFixture)
    expect(mockEnvoyerNotification).toHaveBeenCalledWith(devisFixture)
  })

  it('accepte taille et message optionnels', async () => {
    mockPrisma.produit.findUnique.mockResolvedValue(produit)
    mockPrisma.devis.create.mockResolvedValue(devisFixture)
    const result = await creerDevis({
      nomComplet: 'Jean Dupont', email: 'jean@test.com',
      telephone: '+237690000000', produitId: 1, quantite: 1,
      taille: 'L', message: 'Urgent',
    })
    expect(result.ok).toBe(true)
    expect(mockPrisma.devis.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ taille: 'L', message: 'Urgent' }),
      }),
    )
  })

  it('met taille/message à null si non fournis', async () => {
    mockPrisma.produit.findUnique.mockResolvedValue(produit)
    mockPrisma.devis.create.mockResolvedValue(devisFixture)
    await creerDevis({
      nomComplet: 'Jean', email: 'j@t.com', telephone: '12345678', produitId: 1, quantite: 1,
    })
    expect(mockPrisma.devis.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ taille: null, message: null }),
      }),
    )
  })
})

describe('quoteService — listerDevis', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne les devis paginés', async () => {
    mockPrisma.devis.findMany.mockResolvedValue([devisFixture])
    mockPrisma.devis.count.mockResolvedValue(1)
    const result = await listerDevis({ page: 1, limit: 10 })
    expect(result.ok).toBe(true)
    expect(result.data?.items).toHaveLength(1)
    expect(result.data?.total).toBe(1)
  })

  it('filtre par estTraite', async () => {
    mockPrisma.devis.findMany.mockResolvedValue([])
    mockPrisma.devis.count.mockResolvedValue(0)
    await listerDevis({ page: 1, limit: 10, estTraite: true })
    expect(mockPrisma.devis.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { estTraite: true } }),
    )
  })

  it('pagine correctement', async () => {
    mockPrisma.devis.findMany.mockResolvedValue([])
    mockPrisma.devis.count.mockResolvedValue(0)
    await listerDevis({ page: 3, limit: 20 })
    expect(mockPrisma.devis.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40, take: 20 }),
    )
  })
})

describe('quoteService — obtenirDevis', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 404 si introuvable', async () => {
    mockPrisma.devis.findUnique.mockResolvedValue(null)
    const result = await obtenirDevis(999)
    expect(result.ok).toBe(false)
    expect(result.code).toBe('DEVIS_INTROUVABLE')
  })

  it('retourne le devis', async () => {
    mockPrisma.devis.findUnique.mockResolvedValue(devisFixture)
    const result = await obtenirDevis(1)
    expect(result.ok).toBe(true)
    expect(result.data).toBe(devisFixture)
  })
})

describe('quoteService — marquerDevisTraite', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 404 si introuvable', async () => {
    mockPrisma.devis.findUnique.mockResolvedValue(null)
    const result = await marquerDevisTraite(999, 6)
    expect(result.ok).toBe(false)
    expect(result.code).toBe('DEVIS_INTROUVABLE')
  })

  it('marque le devis comme traité', async () => {
    mockPrisma.devis.findUnique.mockResolvedValue({ id: 1 })
    mockPrisma.devis.update.mockResolvedValue({ ...devisFixture, estTraite: true })
    const result = await marquerDevisTraite(1, 6)
    expect(result.ok).toBe(true)
    expect(mockPrisma.devis.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ estTraite: true, administrateurId: 6 }),
      }),
    )
  })
})
