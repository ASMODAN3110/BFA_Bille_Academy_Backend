import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    evenement: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    categorie: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('../src/config/database', () => ({ default: mockPrisma }))

import { getAll, getById, create, update, remove } from '../src/controllers/eventController'
import type { Request, Response } from 'express'

function mockRes(): Response {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as unknown as Response
}

const evenementFixture = {
  id: 1, titre: 'Match U13', date: new Date('2026-10-01'), heure: '15:30',
  lieu: 'Stade BFA', type: 'MATCH', categorieId: 34,
  equipeA: 'BFA', equipeB: 'FC Union', typeMatch: 'CHAMPIONNAT',
  scoreA: 2, scoreB: 1, objectif: null, duree: null,
  categorie: { id: 34, nom: 'U13' },
}

describe('eventController — getAll', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne les événements paginés', async () => {
    mockPrisma.evenement.findMany.mockResolvedValue([evenementFixture])
    mockPrisma.evenement.count.mockResolvedValue(1)
    const req = { query: {} } as unknown as Request
    const res = mockRes()
    await getAll(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ items: [evenementFixture] }) }),
    )
  })

  it('filtre par categorieId', async () => {
    mockPrisma.evenement.findMany.mockResolvedValue([])
    mockPrisma.evenement.count.mockResolvedValue(0)
    const req = { query: { categorieId: '34' } } as unknown as Request
    const res = mockRes()
    await getAll(req, res)
    expect(mockPrisma.evenement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ categorieId: 34 }) }),
    )
  })

  it('retourne 400 si categorieId invalide', async () => {
    const req = { query: { categorieId: 'abc' } } as unknown as Request
    const res = mockRes()
    await getAll(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('filtre par type', async () => {
    mockPrisma.evenement.findMany.mockResolvedValue([])
    mockPrisma.evenement.count.mockResolvedValue(0)
    const req = { query: { type: 'MATCH' } } as unknown as Request
    const res = mockRes()
    await getAll(req, res)
    expect(mockPrisma.evenement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ type: 'MATCH' }) }),
    )
  })

  it('retourne 400 si type invalide', async () => {
    const req = { query: { type: 'AUTRE' } } as unknown as Request
    const res = mockRes()
    await getAll(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('filtre par mois', async () => {
    mockPrisma.evenement.findMany.mockResolvedValue([])
    mockPrisma.evenement.count.mockResolvedValue(0)
    const req = { query: { month: '2026-09' } } as unknown as Request
    const res = mockRes()
    await getAll(req, res)
    expect(mockPrisma.evenement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ date: expect.anything() }) }),
    )
  })

  it('retourne 400 si month invalide', async () => {
    const req = { query: { month: '2026/09' } } as unknown as Request
    const res = mockRes()
    await getAll(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('eventController — getById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'abc' } } as unknown as Request
    const res = mockRes()
    await getById(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si l\'événement n\'existe pas', async () => {
    mockPrisma.evenement.findUnique.mockResolvedValue(null)
    const req = { params: { id: '999' } } as unknown as Request
    const res = mockRes()
    await getById(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('retourne l\'événement avec sa catégorie', async () => {
    mockPrisma.evenement.findUnique.mockResolvedValue(evenementFixture)
    const req = { params: { id: '1' } } as unknown as Request
    const res = mockRes()
    await getById(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: evenementFixture }),
    )
  })
})

describe('eventController — create', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si le body est invalide', async () => {
    const req = { body: { titre: 'AB' } } as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 400 si MATCH sans les deux équipes', async () => {
    const req = {
      body: {
        titre: 'Match U13', date: '2026-10-01', heure: '15:30',
        lieu: 'Stade', type: 'MATCH', categorieId: 34,
        equipeA: 'BFA', // pas de equipeB
      },
    } as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('équipe') }),
    )
  })

  it('retourne 404 si la catégorie n\'existe pas', async () => {
    mockPrisma.categorie.findUnique.mockResolvedValue(null)
    const req = {
      body: {
        titre: 'Entraînement U13', date: '2026-10-01', heure: '15:30',
        lieu: 'Stade', type: 'ENTRAINEMENT', categorieId: 999,
      },
    } as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('retourne 201 et crée un ENTRAINEMENT', async () => {
    mockPrisma.categorie.findUnique.mockResolvedValue({ id: 34, nom: 'U13' })
    mockPrisma.evenement.create.mockResolvedValue({ id: 10, titre: 'Entraînement U13', type: 'ENTRAINEMENT' })
    const req = {
      body: {
        titre: 'Entraînement U13', date: '2026-10-01', heure: '15:30',
        lieu: 'Stade', type: 'ENTRAINEMENT', categorieId: 34,
      },
      user: { id: 6 },
    } as unknown as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('retourne 201 et crée un MATCH avec les champs spécifiques', async () => {
    mockPrisma.categorie.findUnique.mockResolvedValue({ id: 34, nom: 'U13' })
    mockPrisma.evenement.create.mockResolvedValue({ id: 11, titre: 'Match', type: 'MATCH' })
    const req = {
      body: {
        titre: 'Match U13', date: '2026-10-01', heure: '15:30',
        lieu: 'Stade', type: 'MATCH', categorieId: 34,
        equipeA: 'BFA', equipeB: 'FC Union', typeMatch: 'CHAMPIONNAT',
        scoreA: 2, scoreB: 1,
      },
      user: { id: 6 },
    } as unknown as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(mockPrisma.evenement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          equipeA: 'BFA', equipeB: 'FC Union', typeMatch: 'CHAMPIONNAT',
          scoreA: 2, scoreB: 1,
        }),
      }),
    )
  })
})

describe('eventController — update', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' }, body: {} } as unknown as Request
    const res = mockRes()
    await update(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si l\'événement n\'existe pas', async () => {
    mockPrisma.evenement.findUnique.mockResolvedValue(null)
    const req = { params: { id: '999' }, body: {} } as unknown as Request
    const res = mockRes()
    await update(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('met à jour un événement', async () => {
    const existant = {
      id: 1, titre: 'Match U13', date: new Date('2026-10-01'),
      heure: '15:30', lieu: 'Stade BFA', type: 'MATCH', categorieId: 34,
      equipeA: 'BFA', equipeB: 'FC Union', typeMatch: 'CHAMPIONNAT',
      scoreA: 2, scoreB: 1, objectif: null, duree: null,
    }
    mockPrisma.evenement.findUnique.mockResolvedValue(existant)
    mockPrisma.categorie.findUnique.mockResolvedValue({ id: 34 })
    mockPrisma.evenement.update.mockResolvedValue({ ...existant, scoreA: 3 })
    const req = {
      params: { id: '1' },
      body: { scoreA: 3 },
    } as unknown as Request
    const res = mockRes()
    await update(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('eventController — remove', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si l\'événement n\'existe pas', async () => {
    mockPrisma.evenement.findUnique.mockResolvedValue(null)
    const req = { params: { id: '999' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('supprime l\'événement', async () => {
    mockPrisma.evenement.findUnique.mockResolvedValue({ id: 1 })
    mockPrisma.evenement.delete.mockResolvedValue({})
    const req = { params: { id: '1' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Événement supprimé' }),
    )
  })
})
