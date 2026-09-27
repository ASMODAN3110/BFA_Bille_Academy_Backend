import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    joueur: {
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

import { getAll, getById, create, update, remove } from '../src/controllers/playerController'
import type { Request, Response } from 'express'

function mockRes(): Response {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as unknown as Response
}

const joueurFixtures = [
  {
    id: 106, nom: 'Etoa', prenom: 'Lucas', dateNaissance: new Date('2016-01-15'),
    poste: 'Défenseur', photo: null, dateArrivee: new Date(), categorieId: 34,
    administrateurId: 6, categorie: { id: 34, nom: 'U9' },
  },
]

describe('playerController — getAll (ENF-SEC-04)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne les joueurs avec age au lieu de dateNaissance', async () => {
    mockPrisma.joueur.findMany.mockResolvedValue(joueurFixtures)
    mockPrisma.joueur.count.mockResolvedValue(1)
    const req = { query: {} } as unknown as Request
    const res = mockRes()
    await getAll(req, res)
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(payload.success).toBe(true)
    expect(payload.data.items[0]).not.toHaveProperty('dateNaissance')
    expect(payload.data.items[0]).toHaveProperty('age')
    expect(payload.data.items[0].age).toBe(10) // né en 2016, on est en 2026
  })

  it('retourne 400 si categorieId est invalide', async () => {
    const req = { query: { categorieId: 'abc' } } as unknown as Request
    const res = mockRes()
    await getAll(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('filtre par categorieId valide', async () => {
    mockPrisma.joueur.findMany.mockResolvedValue([])
    mockPrisma.joueur.count.mockResolvedValue(0)
    const req = { query: { categorieId: '34' } } as unknown as Request
    const res = mockRes()
    await getAll(req, res)
    expect(mockPrisma.joueur.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { categorieId: 34 } }),
    )
  })

  it('pagine les résultats', async () => {
    mockPrisma.joueur.findMany.mockResolvedValue([])
    mockPrisma.joueur.count.mockResolvedValue(0)
    const req = { query: { page: '2', limit: '5' } } as unknown as Request
    const res = mockRes()
    await getAll(req, res)
    expect(mockPrisma.joueur.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 }),
    )
  })
})

describe('playerController — getById (ENF-SEC-04)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'abc' } } as unknown as Request
    const res = mockRes()
    await getById(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si le joueur n\'existe pas', async () => {
    mockPrisma.joueur.findUnique.mockResolvedValue(null)
    const req = { params: { id: '999' } } as unknown as Request
    const res = mockRes()
    await getById(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('retourne le joueur avec age sans dateNaissance', async () => {
    mockPrisma.joueur.findUnique.mockResolvedValue(joueurFixtures[0])
    const req = { params: { id: '106' } } as unknown as Request
    const res = mockRes()
    await getById(req, res)
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(payload.data).not.toHaveProperty('dateNaissance')
    expect(payload.data).toHaveProperty('age', 10)
    expect(payload.data).toHaveProperty('nom', 'Etoa')
  })
})

describe('playerController — create', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si le body est invalide', async () => {
    const req = { body: { nom: 'A' } } as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 400 si l\'âge est < 9 ans', async () => {
    mockPrisma.categorie.findUnique.mockResolvedValue({ id: 34, nom: 'U9', ageMin: 9, ageMax: 10 })
    const req = {
      body: {
        nom: 'Dupont', prenom: 'Jean', poste: 'Gardien',
        dateNaissance: '2020-01-01', categorieId: 34,
      },
    } as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('9 ans') }),
    )
  })

  it('retourne 404 si la catégorie n\'existe pas', async () => {
    mockPrisma.categorie.findUnique.mockResolvedValue(null)
    const req = {
      body: {
        nom: 'Dupont', prenom: 'Jean', poste: 'Gardien',
        dateNaissance: '2015-01-01', categorieId: 999,
      },
    } as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('retourne 400 si l\'âge ne correspond pas à la catégorie', async () => {
    mockPrisma.categorie.findUnique.mockResolvedValue({ id: 34, nom: 'U9', ageMin: 9, ageMax: 10 })
    const req = {
      body: {
        nom: 'Dupont', prenom: 'Jean', poste: 'Gardien',
        dateNaissance: '2012-01-15', categorieId: 34,
      },
    } as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('ne correspond pas') }),
    )
  })

  it('retourne 201 et crée le joueur', async () => {
    mockPrisma.categorie.findUnique.mockResolvedValue({ id: 34, nom: 'U9', ageMin: 9, ageMax: 10 })
    mockPrisma.joueur.create.mockResolvedValue({ id: 120, nom: 'Dupont', prenom: 'Jean', poste: 'Gardien', categorieId: 34 })
    const req = {
      body: {
        nom: 'Dupont', prenom: 'Jean', poste: 'Gardien',
        dateNaissance: '2016-01-15', categorieId: 34,
      },
      user: { id: 6 },
    } as unknown as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ nom: 'Dupont' }) }),
    )
  })
})

describe('playerController — update', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' }, body: {} } as unknown as Request
    const res = mockRes()
    await update(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si le joueur n\'existe pas', async () => {
    mockPrisma.joueur.findUnique.mockResolvedValue(null)
    const req = { params: { id: '999' }, body: {} } as unknown as Request
    const res = mockRes()
    await update(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('met à jour le joueur avec succès', async () => {
    const existant = {
      id: 106, nom: 'Etoa', prenom: 'Lucas', dateNaissance: new Date('2016-01-15'),
      poste: 'Défenseur', photo: null, categorieId: 34,
    }
    mockPrisma.joueur.findUnique.mockResolvedValue(existant)
    mockPrisma.categorie.findUnique.mockResolvedValue({ id: 34, nom: 'U9', ageMin: 9, ageMax: 10 })
    mockPrisma.joueur.update.mockResolvedValue({ ...existant, poste: 'Milieu' })
    const req = {
      params: { id: '106' },
      body: { poste: 'Milieu' },
    } as unknown as Request
    const res = mockRes()
    await update(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    )
  })
})

describe('playerController — remove', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'abc' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si le joueur n\'existe pas', async () => {
    mockPrisma.joueur.findUnique.mockResolvedValue(null)
    const req = { params: { id: '999' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('supprime le joueur', async () => {
    mockPrisma.joueur.findUnique.mockResolvedValue({ id: 106 })
    mockPrisma.joueur.delete.mockResolvedValue({})
    const req = { params: { id: '106' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Joueur supprimé' }),
    )
  })
})
