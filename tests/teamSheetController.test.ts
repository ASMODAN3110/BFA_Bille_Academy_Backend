import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockService } = vi.hoisted(() => ({
  mockService: {
    listerFiches: vi.fn(),
    obtenirFiche: vi.fn(),
    obtenirFicheParCategorie: vi.fn(),
    creerFiche: vi.fn(),
    modifierFiche: vi.fn(),
    modifierFichePartielle: vi.fn(),
    supprimerFiche: vi.fn(),
  },
}))

vi.mock('../src/services/teamSheetService', () => mockService)

import { getAll, getByCategorie, getById, create, update, patch, remove } from '../src/controllers/teamSheetController'
import type { Request, Response } from 'express'

function mockRes(): Response {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as unknown as Response
}

const ficheFixture = {
  id: 1, categorieId: 34, saison: '2025-2026', staff: 'Coach Jean',
  palmares: 'Champion', objectifs: 'Top 3', categorie: { id: 34, nom: 'U13' },
  effectif: 12,
}

describe('teamSheetController — getAll', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne les fiches paginées', async () => {
    mockService.listerFiches.mockResolvedValue({
      ok: true, data: { items: [ficheFixture], total: 1, page: 1, limit: 10, totalPages: 1 },
    })
    const req = { query: {} } as unknown as Request
    const res = mockRes()
    await getAll(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('teamSheetController — getByCategorie', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si categorieId invalide', async () => {
    const req = { params: { categorieId: 'x' } } as unknown as Request
    const res = mockRes()
    await getByCategorie(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si la catégorie n\'a pas de fiche', async () => {
    mockService.obtenirFicheParCategorie.mockResolvedValue({
      ok: false, code: 'FICHE_INTROUVABLE', message: 'Aucune fiche.',
    })
    const req = { params: { categorieId: '34' } } as unknown as Request
    const res = mockRes()
    await getByCategorie(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('retourne la fiche avec effectif', async () => {
    mockService.obtenirFicheParCategorie.mockResolvedValue({ ok: true, data: ficheFixture })
    const req = { params: { categorieId: '34' } } as unknown as Request
    const res = mockRes()
    await getByCategorie(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: ficheFixture }),
    )
  })
})

describe('teamSheetController — getById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' } } as unknown as Request
    const res = mockRes()
    await getById(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si la fiche n\'existe pas', async () => {
    mockService.obtenirFiche.mockResolvedValue({ ok: false, code: 'FICHE_INTROUVABLE', message: 'Introuvable' })
    const req = { params: { id: '999' } } as unknown as Request
    const res = mockRes()
    await getById(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('retourne la fiche', async () => {
    mockService.obtenirFiche.mockResolvedValue({ ok: true, data: ficheFixture })
    const req = { params: { id: '1' } } as unknown as Request
    const res = mockRes()
    await getById(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: ficheFixture }),
    )
  })
})

describe('teamSheetController — create', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si le body est invalide', async () => {
    const req = { body: { categorieId: 'x' } } as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 409 si une fiche existe déjà pour la catégorie', async () => {
    mockService.creerFiche.mockResolvedValue({
      ok: false, code: 'FICHE_EXISTANTE', message: 'Fiche déjà existante.',
    })
    const req = { body: { categorieId: 34, saison: '2025-2026' }, user: { id: 6 } } as unknown as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(409)
  })

  it('retourne 201 et crée la fiche', async () => {
    mockService.creerFiche.mockResolvedValue({ ok: true, data: ficheFixture })
    const req = { body: { categorieId: 34, saison: '2025-2026' }, user: { id: 6 } } as unknown as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(mockService.creerFiche).toHaveBeenCalledWith(req.body, 6)
  })
})

describe('teamSheetController — update', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' }, body: {} } as unknown as Request
    const res = mockRes()
    await update(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 400 si le body est invalide', async () => {
    const req = { params: { id: '1' }, body: { saison: 'bad' } } as unknown as Request
    const res = mockRes()
    await update(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('met à jour la fiche', async () => {
    mockService.modifierFiche.mockResolvedValue({ ok: true, data: ficheFixture })
    const req = { params: { id: '1' }, body: { saison: '2025-2026' }, user: { id: 6 } } as unknown as Request
    const res = mockRes()
    await update(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('teamSheetController — patch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' }, body: {} } as unknown as Request
    const res = mockRes()
    await patch(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('met à jour partiellement', async () => {
    mockService.modifierFichePartielle.mockResolvedValue({ ok: true, data: ficheFixture })
    const req = { params: { id: '1' }, body: { staff: 'Nouveau coach' }, user: { id: 6 } } as unknown as Request
    const res = mockRes()
    await patch(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('teamSheetController — remove', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si la fiche n\'existe pas', async () => {
    mockService.supprimerFiche.mockResolvedValue({ ok: false, code: 'FICHE_INTROUVABLE', message: 'Introuvable' })
    const req = { params: { id: '999' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('supprime la fiche', async () => {
    mockService.supprimerFiche.mockResolvedValue({ ok: true })
    const req = { params: { id: '1' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Fiche technique supprimée.' }),
    )
  })
})
