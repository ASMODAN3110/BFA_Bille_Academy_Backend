import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock de prisma avant l'import du controller
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    categorie: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('../src/config/database', () => ({ default: mockPrisma }))

import { getAll, create, update, remove } from '../src/controllers/categoryController'
import type { Request, Response } from 'express'

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response
  return res
}

describe('categoryController — getAll', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne les catégories triées par ageMin', async () => {
    mockPrisma.categorie.findMany.mockResolvedValue([
      { id: 34, nom: 'U9', ageMin: 9, ageMax: 10 },
      { id: 35, nom: 'U15', ageMin: 13, ageMax: 15 },
    ])
    const res = mockRes()
    await getAll({} as Request, res)
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        { id: 34, nom: 'U9', ageMin: 9, ageMax: 10 },
        { id: 35, nom: 'U15', ageMin: 13, ageMax: 15 },
      ],
    })
    expect(mockPrisma.categorie.findMany).toHaveBeenCalledWith({
      orderBy: { ageMin: 'asc' },
    })
  })
})

describe('categoryController — create', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si le body est invalide', async () => {
    const req = { body: { nom: 'U' } } as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    )
  })

  it('retourne 409 si le nom existe déjà', async () => {
    mockPrisma.categorie.findUnique.mockResolvedValue({ id: 34, nom: 'U13' })
    const req = { body: { nom: 'U13', ageMin: 12, ageMax: 13 } } as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('existe déjà') }),
    )
  })

  it('retourne 409 si la tranche chevauche une catégorie existante', async () => {
    mockPrisma.categorie.findUnique.mockResolvedValue(null)
    mockPrisma.categorie.findFirst.mockResolvedValue({ id: 34, nom: 'U9', ageMin: 9, ageMax: 10 })
    const req = { body: { nom: 'U11', ageMin: 10, ageMax: 12 } } as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('chevauche') }),
    )
  })

  it('retourne 201 et crée la catégorie', async () => {
    mockPrisma.categorie.findUnique.mockResolvedValue(null)
    mockPrisma.categorie.findFirst.mockResolvedValue(null)
    mockPrisma.categorie.create.mockResolvedValue({ id: 40, nom: 'U13', ageMin: 12, ageMax: 13 })
    const req = { body: { nom: 'U13', ageMin: 12, ageMax: 13 } } as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ nom: 'U13' }) }),
    )
  })
})

describe('categoryController — update', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'abc' }, body: {} } as unknown as Request
    const res = mockRes()
    await update(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si la catégorie n\'existe pas', async () => {
    mockPrisma.categorie.findUnique.mockResolvedValue(null)
    const req = { params: { id: '999' }, body: {} } as unknown as Request
    const res = mockRes()
    await update(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('retourne 409 si le nouveau nom existe déjà', async () => {
    mockPrisma.categorie.findUnique.mockResolvedValue({ id: 35, nom: 'U15', ageMin: 13, ageMax: 15 })
    mockPrisma.categorie.findFirst.mockResolvedValue({ id: 34, nom: 'U9' })
    const req = { params: { id: '35' }, body: { nom: 'U9' } } as unknown as Request
    const res = mockRes()
    await update(req, res)
    expect(res.status).toHaveBeenCalledWith(409)
  })

  it('met à jour la catégorie avec succès', async () => {
    mockPrisma.categorie.findUnique.mockResolvedValue({ id: 35, nom: 'U15', ageMin: 13, ageMax: 15 })
    mockPrisma.categorie.findFirst.mockResolvedValue(null)
    mockPrisma.categorie.update.mockResolvedValue({ id: 35, nom: 'U14', ageMin: 13, ageMax: 14 })
    const req = { params: { id: '35' }, body: { nom: 'U14', ageMax: 14 } } as unknown as Request
    const res = mockRes()
    await update(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ nom: 'U14' }) }),
    )
  })
})

describe('categoryController — remove', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'xyz' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si la catégorie n\'existe pas', async () => {
    mockPrisma.categorie.findUnique.mockResolvedValue(null)
    const req = { params: { id: '999' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('retourne 409 si des entités sont liées', async () => {
    mockPrisma.categorie.findUnique.mockResolvedValue({
      id: 34,
      nom: 'U9',
      _count: { joueurs: 3, evenements: 2, resultats: 1 },
    })
    const req = { params: { id: '34' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('3 joueur') }),
    )
  })

  it('supprime la catégorie si aucune entité liée', async () => {
    mockPrisma.categorie.findUnique.mockResolvedValue({
      id: 40,
      nom: 'U13',
      _count: { joueurs: 0, evenements: 0, resultats: 0 },
    })
    mockPrisma.categorie.delete.mockResolvedValue({})
    const req = { params: { id: '40' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: expect.stringContaining('supprimée') }),
    )
  })
})
