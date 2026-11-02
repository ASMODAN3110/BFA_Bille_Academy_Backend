import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPrisma, mockEnvoyerConfirmation, mockEnvoyerNotification } = vi.hoisted(() => ({
  mockPrisma: {
    produit: { findMany: vi.fn() },
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

const produit = { id: 1, nom: 'Maillot BFA', stock: 10 }
const devisFixture = {
  id: 1, nomComplet: 'Jean Dupont', email: 'jean@test.com',
  telephone: '+237690000000',
  message: null, estTraite: false, dateDemande: new Date(), administrateurId: null,
  lignes: [{ id: 1, devisId: 1, produitId: 1, produitNom: 'Maillot BFA', quantite: 2, taille: 'M' }],
}

const base = { nomComplet: 'Jean Dupont', email: 'jean@test.com', telephone: '+237690000000' }

describe('quoteService — creerDevis', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne PRODUIT_INTROUVABLE si le produit n\'existe pas', async () => {
    mockPrisma.produit.findMany.mockResolvedValue([])
    const result = await creerDevis({ produitId: 999, nomComplet: 'X', email: 'x@t.com', telephone: '12345678', quantite: 1 })
    expect(result.ok).toBe(false)
    expect(result.code).toBe('PRODUIT_INTROUVABLE')
    expect(mockPrisma.devis.create).not.toHaveBeenCalled()
  })

  it('crée le devis (ancien format : un seul produit) et envoie les emails', async () => {
    mockPrisma.produit.findMany.mockResolvedValue([produit])
    mockPrisma.devis.create.mockResolvedValue(devisFixture)
    const result = await creerDevis({ ...base, produitId: 1, quantite: 2, taille: 'M' })
    expect(result.ok).toBe(true)
    expect(result.data).toBe(devisFixture)
    expect(mockEnvoyerConfirmation).toHaveBeenCalledWith(devisFixture)
    expect(mockEnvoyerNotification).toHaveBeenCalledWith(devisFixture)
  })

  it('accepte taille et message optionnels', async () => {
    mockPrisma.produit.findMany.mockResolvedValue([produit])
    mockPrisma.devis.create.mockResolvedValue(devisFixture)
    const result = await creerDevis({ ...base, produitId: 1, quantite: 1, taille: 'L', message: 'Urgent' })
    expect(result.ok).toBe(true)
    const data = mockPrisma.devis.create.mock.calls[0][0].data
    expect(data.message).toBe('Urgent')
    expect(data.lignes.create).toEqual([
      { produit: { connect: { id: 1 } }, produitNom: 'Maillot BFA', quantite: 1, taille: 'L' },
    ])
  })

  it('met taille/message à null si non fournis', async () => {
    mockPrisma.produit.findMany.mockResolvedValue([produit])
    mockPrisma.devis.create.mockResolvedValue(devisFixture)
    await creerDevis({ nomComplet: 'Jean', email: 'j@t.com', telephone: '12345678', produitId: 1, quantite: 1 })
    const data = mockPrisma.devis.create.mock.calls[0][0].data
    expect(data.message).toBeNull()
    expect(data.lignes.create[0].taille).toBeNull()
  })

  it('crée un seul devis avec une ligne par article (plusieurs articles)', async () => {
    mockPrisma.produit.findMany.mockResolvedValue([
      { id: 1, nom: 'Maillot BFA', stock: 10 }, { id: 2, nom: 'Short BFA', stock: 10 }, { id: 3, nom: 'Ballon BFA', stock: 10 },
    ])
    mockPrisma.devis.create.mockResolvedValue(devisFixture)
    const result = await creerDevis({
      ...base,
      lignes: [
        { produitId: 1, quantite: 14, taille: 'M' },
        { produitId: 2, quantite: 14, taille: 'M' },
        { produitId: 3, quantite: 3 },
      ],
    })
    expect(result.ok).toBe(true)
    expect(mockPrisma.devis.create).toHaveBeenCalledTimes(1)
    const data = mockPrisma.devis.create.mock.calls[0][0].data
    expect(data.lignes.create).toHaveLength(3)
    expect(data.lignes.create.map((l: any) => l.produitNom)).toEqual(['Maillot BFA', 'Short BFA', 'Ballon BFA'])
    expect(mockEnvoyerConfirmation).toHaveBeenCalledTimes(1)
    expect(mockEnvoyerNotification).toHaveBeenCalledTimes(1)
  })

  it('charge tous les produits en une seule requête', async () => {
    mockPrisma.produit.findMany.mockResolvedValue([{ id: 1, nom: 'A', stock: 10 }, { id: 2, nom: 'B', stock: 10 }])
    mockPrisma.devis.create.mockResolvedValue(devisFixture)
    await creerDevis({ ...base, lignes: [{ produitId: 1, quantite: 1 }, { produitId: 2, quantite: 1 }, { produitId: 1, quantite: 1, taille: 'L' }] })
    expect(mockPrisma.produit.findMany).toHaveBeenCalledTimes(1)
    expect(mockPrisma.produit.findMany.mock.calls[0][0].where).toEqual({ id: { in: [1, 2] } })
  })

  it('additionne les quantités d\'un même produit et d\'une même taille', async () => {
    mockPrisma.produit.findMany.mockResolvedValue([{ id: 1, nom: 'Maillot BFA', stock: 10 }])
    mockPrisma.devis.create.mockResolvedValue(devisFixture)
    await creerDevis({
      ...base,
      lignes: [
        { produitId: 1, quantite: 2, taille: 'M' },
        { produitId: 1, quantite: 3, taille: 'M' },
        { produitId: 1, quantite: 4, taille: 'L' },
      ],
    })
    const lignes = mockPrisma.devis.create.mock.calls[0][0].data.lignes.create
    expect(lignes).toHaveLength(2)
    expect(lignes.find((l: any) => l.taille === 'M').quantite).toBe(5)
    expect(lignes.find((l: any) => l.taille === 'L').quantite).toBe(4)
  })

  it('refuse tout le devis si un des produits n\'existe pas', async () => {
    mockPrisma.produit.findMany.mockResolvedValue([{ id: 1, nom: 'Maillot BFA', stock: 10 }])
    const result = await creerDevis({ ...base, lignes: [{ produitId: 1, quantite: 1 }, { produitId: 999, quantite: 1 }] })
    expect(result.ok).toBe(false)
    expect(result.code).toBe('PRODUIT_INTROUVABLE')
    expect(mockPrisma.devis.create).not.toHaveBeenCalled()
    expect(mockEnvoyerConfirmation).not.toHaveBeenCalled()
  })

  it('refuse un produit en rupture de stock (aucun devis créé)', async () => {
    mockPrisma.produit.findMany.mockResolvedValue([
      { id: 1, nom: 'Maillot BFA', stock: 10 }, { id: 2, nom: 'Casquette BFA', stock: 0 },
    ])
    const result = await creerDevis({ ...base, lignes: [{ produitId: 1, quantite: 1 }, { produitId: 2, quantite: 1 }] })
    expect(result.ok).toBe(false)
    expect(result.code).toBe('PRODUIT_INTROUVABLE')
    expect(result.message).toMatch(/rupture de stock.*Casquette BFA/)
    expect(mockPrisma.devis.create).not.toHaveBeenCalled()
    expect(mockEnvoyerConfirmation).not.toHaveBeenCalled()
  })

  it('lit le devis avec ses lignes (include)', async () => {
    mockPrisma.produit.findMany.mockResolvedValue([produit])
    mockPrisma.devis.create.mockResolvedValue(devisFixture)
    await creerDevis({ ...base, produitId: 1, quantite: 1 })
    expect(mockPrisma.devis.create.mock.calls[0][0].include).toEqual({ lignes: { orderBy: { id: 'asc' } } })
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
