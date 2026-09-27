import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPrisma, mockEnvoyerAccuse, mockEnvoyerConfirm, mockEnvoyerRefus } = vi.hoisted(() => ({
  mockPrisma: {
    categorie: { findFirst: vi.fn() },
    demandeEssai: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  mockEnvoyerAccuse: vi.fn().mockResolvedValue(undefined),
  mockEnvoyerConfirm: vi.fn().mockResolvedValue(undefined),
  mockEnvoyerRefus: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../src/config/database', () => ({ default: mockPrisma }))
vi.mock('../src/services/emailService', () => ({
  envoyerAccuseReception: mockEnvoyerAccuse,
  envoyerConfirmationEssai: mockEnvoyerConfirm,
  envoyerRefusEssai: mockEnvoyerRefus,
}))

import {
  trouverCategoriePourAge,
  creerDemandeEssai,
  listerDemandesEssais,
  obtenirDemandeEssai,
  validerDemandeEssai,
  refuserDemandeEssai,
  supprimerDemandeEssai,
} from '../src/services/trialService'

const demandeFixture = {
  id: 1, nomJoueur: 'Dupont', prenomJoueur: 'Jean', age: 12,
  telephone: '+237690000000', email: 'jean@test.com',
  dateEssai: new Date('2027-01-15'), message: null, motifRefus: null,
  statut: 'EN_ATTENTE' as const, dateSoumission: new Date(), administrateurId: null,
  traitePar: null,
}

describe('trialService — trouverCategoriePourAge', () => {
  it('retourne la catégorie couvrant l\'âge', async () => {
    mockPrisma.categorie.findFirst.mockResolvedValue({ id: 35, nom: 'U15', ageMin: 13, ageMax: 15 })
    const c = await trouverCategoriePourAge(14)
    expect(c?.nom).toBe('U15')
    expect(mockPrisma.categorie.findFirst).toHaveBeenCalledWith({
      where: { ageMin: { lte: 14 }, ageMax: { gte: 14 } },
    })
  })

  it('retourne null si aucune catégorie ne couvre l\'âge', async () => {
    mockPrisma.categorie.findFirst.mockResolvedValue(null)
    expect(await trouverCategoriePourAge(12)).toBeNull()
  })
})

describe('trialService — creerDemandeEssai', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne CATEGORIE_INTROUVABLE si aucune catégorie ne couvre l\'âge', async () => {
    mockPrisma.categorie.findFirst.mockResolvedValue(null)
    const result = await creerDemandeEssai({ age: 12, nomJoueur: 'X', prenomJoueur: 'Y', telephone: '123', email: 'x@t.com', dateEssai: '2027-01-15' })
    expect(result.ok).toBe(false)
    expect(result.code).toBe('CATEGORIE_INTROUVABLE')
    expect(result.message).toContain('12 ans')
  })

  it('crée la demande et envoie l\'accusé', async () => {
    mockPrisma.categorie.findFirst.mockResolvedValue({ id: 35 })
    mockPrisma.demandeEssai.create.mockResolvedValue(demandeFixture)
    const result = await creerDemandeEssai({
      nomJoueur: 'Dupont', prenomJoueur: 'Jean', age: 12,
      telephone: '+237690000000', email: 'jean@test.com', dateEssai: '2027-01-15',
    })
    expect(result.ok).toBe(true)
    expect(result.data).toBe(demandeFixture)
    expect(mockEnvoyerAccuse).toHaveBeenCalledWith(demandeFixture)
  })

  it('met message à null si non fourni', async () => {
    mockPrisma.categorie.findFirst.mockResolvedValue({ id: 35 })
    mockPrisma.demandeEssai.create.mockResolvedValue(demandeFixture)
    await creerDemandeEssai({
      nomJoueur: 'X', prenomJoueur: 'Y', age: 13,
      telephone: '123', email: 'x@t.com', dateEssai: '2027-01-15',
    })
    expect(mockPrisma.demandeEssai.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ message: null }),
      }),
    )
  })
})

describe('trialService — listerDemandesEssais', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne les demandes paginées', async () => {
    mockPrisma.demandeEssai.findMany.mockResolvedValue([demandeFixture])
    mockPrisma.demandeEssai.count.mockResolvedValue(1)
    const result = await listerDemandesEssais({ page: 1, limit: 10 })
    expect(result.ok).toBe(true)
    expect(result.data?.items).toHaveLength(1)
  })

  it('filtre par statut', async () => {
    mockPrisma.demandeEssai.findMany.mockResolvedValue([])
    mockPrisma.demandeEssai.count.mockResolvedValue(0)
    await listerDemandesEssais({ page: 1, limit: 10, statut: 'EN_ATTENTE' })
    expect(mockPrisma.demandeEssai.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { statut: 'EN_ATTENTE' } }),
    )
  })
})

describe('trialService — obtenirDemandeEssai', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 404 si introuvable', async () => {
    mockPrisma.demandeEssai.findUnique.mockResolvedValue(null)
    const result = await obtenirDemandeEssai(999)
    expect(result.ok).toBe(false)
    expect(result.code).toBe('INTROUVABLE')
  })

  it('retourne la demande', async () => {
    mockPrisma.demandeEssai.findUnique.mockResolvedValue(demandeFixture)
    const result = await obtenirDemandeEssai(1)
    expect(result.ok).toBe(true)
    expect(result.data).toBe(demandeFixture)
  })
})

describe('trialService — validerDemandeEssai', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 404 si introuvable', async () => {
    mockPrisma.demandeEssai.findUnique.mockResolvedValue(null)
    const result = await validerDemandeEssai(999, 6)
    expect(result.ok).toBe(false)
    expect(result.code).toBe('INTROUVABLE')
  })

  it('retourne 409 si déjà traitée', async () => {
    mockPrisma.demandeEssai.findUnique.mockResolvedValue({ ...demandeFixture, statut: 'CONFIRME' })
    const result = await validerDemandeEssai(1, 6)
    expect(result.ok).toBe(false)
    expect(result.code).toBe('DEJA_TRAITEE')
  })

  it('confirme la demande et envoie l\'email', async () => {
    mockPrisma.demandeEssai.findUnique.mockResolvedValue(demandeFixture)
    mockPrisma.demandeEssai.update.mockResolvedValue({ ...demandeFixture, statut: 'CONFIRME' })
    const result = await validerDemandeEssai(1, 6)
    expect(result.ok).toBe(true)
    expect(mockPrisma.demandeEssai.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { statut: 'CONFIRME', administrateurId: 6 },
      }),
    )
    expect(mockEnvoyerConfirm).toHaveBeenCalled()
  })
})

describe('trialService — refuserDemandeEssai', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 404 si introuvable', async () => {
    mockPrisma.demandeEssai.findUnique.mockResolvedValue(null)
    const result = await refuserDemandeEssai(999, 6, 'Motif')
    expect(result.ok).toBe(false)
    expect(result.code).toBe('INTROUVABLE')
  })

  it('retourne 409 si déjà traitée', async () => {
    mockPrisma.demandeEssai.findUnique.mockResolvedValue({ ...demandeFixture, statut: 'REFUSE' })
    const result = await refuserDemandeEssai(1, 6, 'Motif')
    expect(result.ok).toBe(false)
    expect(result.code).toBe('DEJA_TRAITEE')
  })

  it('refuse la demande avec motif et envoie l\'email', async () => {
    mockPrisma.demandeEssai.findUnique.mockResolvedValue(demandeFixture)
    mockPrisma.demandeEssai.update.mockResolvedValue({ ...demandeFixture, statut: 'REFUSE' })
    const result = await refuserDemandeEssai(1, 6, 'Trop jeune')
    expect(result.ok).toBe(true)
    expect(mockPrisma.demandeEssai.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { statut: 'REFUSE', motifRefus: 'Trop jeune', administrateurId: 6 },
      }),
    )
    expect(mockEnvoyerRefus).toHaveBeenCalled()
  })
})

describe('trialService — supprimerDemandeEssai', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 404 si introuvable', async () => {
    mockPrisma.demandeEssai.findUnique.mockResolvedValue(null)
    const result = await supprimerDemandeEssai(999)
    expect(result.ok).toBe(false)
    expect(result.code).toBe('INTROUVABLE')
  })

  it('supprime la demande', async () => {
    mockPrisma.demandeEssai.findUnique.mockResolvedValue({ id: 1 })
    mockPrisma.demandeEssai.delete.mockResolvedValue({})
    const result = await supprimerDemandeEssai(1)
    expect(result.ok).toBe(true)
    expect(mockPrisma.demandeEssai.delete).toHaveBeenCalledWith({ where: { id: 1 } })
  })
})
