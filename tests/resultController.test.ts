import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockService } = vi.hoisted(() => ({
  mockService: {
    listerResultats: vi.fn(),
    obtenirResultat: vi.fn(),
    creerResultat: vi.fn(),
    modifierResultat: vi.fn(),
    supprimerResultat: vi.fn(),
    lireClassement: vi.fn(),
  },
}))

vi.mock('../src/services/resultService', () => ({
  listerResultats: mockService.listerResultats,
  obtenirResultat: mockService.obtenirResultat,
  creerResultat: mockService.creerResultat,
  modifierResultat: mockService.modifierResultat,
  supprimerResultat: mockService.supprimerResultat,
}))
vi.mock('../src/services/rankingService', () => ({
  lireClassement: mockService.lireClassement,
}))

import { getPublic, getRankings, getAll, getById, create, update, remove } from '../src/controllers/resultController'
import type { Request, Response } from 'express'

function mockRes(): Response {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as unknown as Response
}

const resultatFixture = {
  id: 1, equipeA: 'BFA', equipeB: 'FC Union', scoreA: 2, scoreB: 1,
  date: new Date('2026-10-01'), type: 'CHAMPIONNAT', categorieId: 34,
  categorie: { id: 34, nom: 'U13' },
}

describe('resultController — getPublic', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne les résultats paginés', async () => {
    mockService.listerResultats.mockResolvedValue({
      ok: true, data: { items: [resultatFixture], total: 1, page: 1, limit: 10, totalPages: 1 },
    })
    const req = { query: {} } as unknown as Request
    const res = mockRes()
    await getPublic(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  it('filtre par categorieId', async () => {
    mockService.listerResultats.mockResolvedValue({
      ok: true, data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 },
    })
    const req = { query: { categorieId: '34' } } as unknown as Request
    const res = mockRes()
    await getPublic(req, res)
    expect(mockService.listerResultats).toHaveBeenCalledWith(
      expect.objectContaining({ categorieId: 34 }),
    )
  })

  it('retourne 400 si categorieId invalide', async () => {
    const req = { query: { categorieId: 'abc' } } as unknown as Request
    const res = mockRes()
    await getPublic(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('resultController — getRankings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si categorieId invalide', async () => {
    const req = { params: { categorieId: 'x' } } as unknown as Request
    const res = mockRes()
    await getRankings(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si la catégorie n\'existe pas', async () => {
    mockService.lireClassement.mockResolvedValue({
      ok: false, code: 'CATEGORIE_INTROUVABLE', message: 'Catégorie introuvable.',
    })
    const req = { params: { categorieId: '999' } } as unknown as Request
    const res = mockRes()
    await getRankings(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('retourne le classement', async () => {
    const classement = [{ equipe: 'BFA', points: 12, joues: 4, victoires: 4, nuls: 0, defaites: 0 }]
    mockService.lireClassement.mockResolvedValue({ ok: true, data: classement })
    const req = { params: { categorieId: '34' } } as unknown as Request
    const res = mockRes()
    await getRankings(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: classement }),
    )
  })
})

describe('resultController — getAll (admin)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne les résultats paginés', async () => {
    mockService.listerResultats.mockResolvedValue({
      ok: true, data: { items: [resultatFixture], total: 1, page: 1, limit: 10, totalPages: 1 },
    })
    const req = { query: {} } as unknown as Request
    const res = mockRes()
    await getAll(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('resultController — getById (admin)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' } } as unknown as Request
    const res = mockRes()
    await getById(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si le résultat n\'existe pas', async () => {
    mockService.obtenirResultat.mockResolvedValue({ ok: false, code: 'RESULTAT_INTROUVABLE', message: 'Introuvable' })
    const req = { params: { id: '999' } } as unknown as Request
    const res = mockRes()
    await getById(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('retourne le résultat', async () => {
    mockService.obtenirResultat.mockResolvedValue({ ok: true, data: resultatFixture })
    const req = { params: { id: '1' } } as unknown as Request
    const res = mockRes()
    await getById(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: resultatFixture }),
    )
  })
})

describe('resultController — create', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si le body est invalide', async () => {
    const req = { body: { equipeA: '' } } as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 201 et crée le résultat', async () => {
    mockService.creerResultat.mockResolvedValue({ ok: true, data: resultatFixture })
    const req = {
      body: {
        equipeA: 'BFA', equipeB: 'FC Union', scoreA: 2, scoreB: 1,
        date: '2026-10-01', type: 'CHAMPIONNAT', categorieId: 34,
      },
      user: { id: 6 },
    } as unknown as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(mockService.creerResultat).toHaveBeenCalledWith(req.body, 6)
  })
})

describe('resultController — update', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' }, body: {} } as unknown as Request
    const res = mockRes()
    await update(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 400 si le body est invalide', async () => {
    const req = { params: { id: '1' }, body: { scoreA: -1 } } as unknown as Request
    const res = mockRes()
    await update(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('met à jour le résultat', async () => {
    mockService.modifierResultat.mockResolvedValue({ ok: true, data: resultatFixture })
    const req = {
      params: { id: '1' },
      body: {
        equipeA: 'BFA', equipeB: 'FC Union', scoreA: 2, scoreB: 1,
        date: '2026-10-01', type: 'CHAMPIONNAT', categorieId: 34,
      },
      user: { id: 6 },
    } as unknown as Request
    const res = mockRes()
    await update(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('resultController — remove', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si le résultat n\'existe pas', async () => {
    mockService.supprimerResultat.mockResolvedValue({ ok: false, code: 'RESULTAT_INTROUVABLE', message: 'Introuvable' })
    const req = { params: { id: '999' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('supprime le résultat', async () => {
    mockService.supprimerResultat.mockResolvedValue({ ok: true })
    const req = { params: { id: '1' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Résultat supprimé.' }),
    )
  })
})
