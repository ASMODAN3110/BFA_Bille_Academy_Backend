import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockService } = vi.hoisted(() => ({
  mockService: {
    creerDemandeEssai: vi.fn(),
    listerDemandesEssais: vi.fn(),
    obtenirDemandeEssai: vi.fn(),
    validerDemandeEssai: vi.fn(),
    refuserDemandeEssai: vi.fn(),
    supprimerDemandeEssai: vi.fn(),
  },
}))

vi.mock('../src/services/trialService', () => mockService)

import { create, list, detail, validate, refuse, remove } from '../src/controllers/trialController'
import type { Request, Response } from 'express'

function mockRes(): Response {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as unknown as Response
}

const demandeFixture = {
  id: 1, nomJoueur: 'Dupont', prenomJoueur: 'Jean', age: 12,
  telephone: '+237690000000', email: 'test@example.com',
  dateEssai: new Date('2027-01-15'), message: null, statut: 'EN_ATTENTE',
}

describe('trialController — create', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si le body est invalide', async () => {
    const req = { body: { nomJoueur: '' } } as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 400 si le service rejette (âge/catégorie)', async () => {
    mockService.creerDemandeEssai.mockResolvedValue({
      ok: false, message: 'Aucune catégorie ne correspond à cet âge.',
    })
    const req = {
      body: {
        nomJoueur: 'Dupont', prenomJoueur: 'Jean', age: 12,
        telephone: '+237690000000', email: 'test@example.com',
        dateEssai: '2027-01-15',
      },
    } as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 201 et crée la demande', async () => {
    mockService.creerDemandeEssai.mockResolvedValue({ ok: true, data: demandeFixture })
    const req = {
      body: {
        nomJoueur: 'Dupont', prenomJoueur: 'Jean', age: 12,
        telephone: '+237690000000', email: 'test@example.com',
        dateEssai: '2027-01-15',
      },
    } as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: demandeFixture }),
    )
  })
})

describe('trialController — list', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne les demandes paginées', async () => {
    mockService.listerDemandesEssais.mockResolvedValue({
      ok: true, data: { items: [demandeFixture], total: 1, page: 1, limit: 10, totalPages: 1 },
    })
    const req = { query: {} } as unknown as Request
    const res = mockRes()
    await list(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  it('filtre par statut', async () => {
    mockService.listerDemandesEssais.mockResolvedValue({
      ok: true, data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 },
    })
    const req = { query: { statut: 'EN_ATTENTE' } } as unknown as Request
    const res = mockRes()
    await list(req, res)
    expect(mockService.listerDemandesEssais).toHaveBeenCalledWith(
      expect.objectContaining({ statut: 'EN_ATTENTE' }),
    )
  })

  it('retourne 400 si statut invalide', async () => {
    const req = { query: { statut: 'INVALIDE' } } as unknown as Request
    const res = mockRes()
    await list(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('trialController — detail', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' } } as unknown as Request
    const res = mockRes()
    await detail(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si la demande n\'existe pas', async () => {
    mockService.obtenirDemandeEssai.mockResolvedValue({ ok: false, message: 'Introuvable' })
    const req = { params: { id: '999' } } as unknown as Request
    const res = mockRes()
    await detail(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('retourne la demande', async () => {
    mockService.obtenirDemandeEssai.mockResolvedValue({ ok: true, data: demandeFixture })
    const req = { params: { id: '1' } } as unknown as Request
    const res = mockRes()
    await detail(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: demandeFixture }),
    )
  })
})

describe('trialController — validate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' } } as unknown as Request
    const res = mockRes()
    await validate(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si la demande n\'existe pas', async () => {
    mockService.validerDemandeEssai.mockResolvedValue({ ok: false, code: 'INTROUVABLE', message: 'Introuvable' })
    const req = { params: { id: '999' }, user: { id: 6 } } as unknown as Request
    const res = mockRes()
    await validate(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('retourne 409 si déjà traitée', async () => {
    mockService.validerDemandeEssai.mockResolvedValue({ ok: false, code: 'DEJA_TRAITEE', message: 'Déjà traitée' })
    const req = { params: { id: '1' }, user: { id: 6 } } as unknown as Request
    const res = mockRes()
    await validate(req, res)
    expect(res.status).toHaveBeenCalledWith(409)
  })

  it('confirme la demande', async () => {
    mockService.validerDemandeEssai.mockResolvedValue({ ok: true, data: { ...demandeFixture, statut: 'CONFIRME' } })
    const req = { params: { id: '1' }, user: { id: 6 } } as unknown as Request
    const res = mockRes()
    await validate(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    )
    expect(mockService.validerDemandeEssai).toHaveBeenCalledWith(1, 6)
  })
})

describe('trialController — refuse', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' }, body: {} } as unknown as Request
    const res = mockRes()
    await refuse(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 400 si motif manquant', async () => {
    const req = { params: { id: '1' }, body: {} } as unknown as Request
    const res = mockRes()
    await refuse(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si la demande n\'existe pas', async () => {
    mockService.refuserDemandeEssai.mockResolvedValue({ ok: false, code: 'INTROUVABLE', message: 'Introuvable' })
    const req = { params: { id: '999' }, body: { motifRefus: 'Trop jeune' }, user: { id: 6 } } as unknown as Request
    const res = mockRes()
    await refuse(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('refuse la demande avec motif', async () => {
    mockService.refuserDemandeEssai.mockResolvedValue({ ok: true, data: { ...demandeFixture, statut: 'REFUSE' } })
    const req = { params: { id: '1' }, body: { motifRefus: 'Trop jeune' }, user: { id: 6 } } as unknown as Request
    const res = mockRes()
    await refuse(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    )
    expect(mockService.refuserDemandeEssai).toHaveBeenCalledWith(1, 6, 'Trop jeune')
  })
})

describe('trialController — remove', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si la demande n\'existe pas', async () => {
    mockService.supprimerDemandeEssai.mockResolvedValue({ ok: false, message: 'Introuvable' })
    const req = { params: { id: '999' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('supprime la demande', async () => {
    mockService.supprimerDemandeEssai.mockResolvedValue({ ok: true })
    const req = { params: { id: '1' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Demande d\'essai supprimée.' }),
    )
  })
})
