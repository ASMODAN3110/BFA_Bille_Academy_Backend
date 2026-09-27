import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockService } = vi.hoisted(() => ({
  mockService: {
    getDashboardStats: vi.fn().mockResolvedValue({ ok: true, data: { joueurs: 10, evenements: 5 } }),
    getStatsPlayers: vi.fn().mockResolvedValue({ ok: true, data: { total: 10 } }),
    getStatsTrials: vi.fn().mockResolvedValue({ ok: true, data: { enAttente: 3 } }),
    getStatsEvents: vi.fn().mockResolvedValue({ ok: true, data: { aVenir: 2 } }),
    getStatsBlog: vi.fn().mockResolvedValue({ ok: true, data: { publies: 4 } }),
    getStatsShop: vi.fn().mockResolvedValue({ ok: true, data: { enStock: 8 } }),
    getRecentTrials: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    getRecentActivity: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    getRecentArticles: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    getUpcomingEvents: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    listerAdmins: vi.fn().mockResolvedValue({ ok: true, data: [{ id: 1, nom: 'Admin', email: 'a@test.com', role: 'ADMIN' }] }),
    creerAdmin: vi.fn(),
    modifierAdmin: vi.fn(),
    reinitialiserMotDePasse: vi.fn(),
    changerMotDePasse: vi.fn(),
  },
}))

vi.mock('../src/services/adminService', () => mockService)

import {
  getDashboard, getPlayersStats, getTrialsStats, getEventsStats,
  getBlogStats, getShopStats, getRecentTrialsController,
  getRecentActivityController, getRecentArticlesController, getUpcomingEventsController,
  getUsers, createUser, updateUser, resetUserPassword, updateProfilePassword,
} from '../src/controllers/adminController'
import type { Request, Response } from 'express'

function mockRes(): Response {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as unknown as Response
}

describe('adminController — stats', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getDashboard retourne les stats', async () => {
    const res = mockRes()
    await getDashboard({} as Request, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ joueurs: 10 }) }),
    )
  })

  it('getPlayersStats retourne les effectifs', async () => {
    const res = mockRes()
    await getPlayersStats({} as Request, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  it('getTrialsStats retourne les statuts', async () => {
    const res = mockRes()
    await getTrialsStats({} as Request, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  it('getEventsStats retourne les événements', async () => {
    const res = mockRes()
    await getEventsStats({} as Request, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  it('getBlogStats retourne les articles', async () => {
    const res = mockRes()
    await getBlogStats({} as Request, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  it('getShopStats retourne les produits', async () => {
    const res = mockRes()
    await getShopStats({} as Request, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('adminController — recent', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getRecentTrials retourne les demandes', async () => {
    const res = mockRes()
    await getRecentTrialsController({} as Request, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  it('getRecentActivity retourne la timeline', async () => {
    const res = mockRes()
    await getRecentActivityController({} as Request, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  it('getRecentArticles retourne les articles', async () => {
    const res = mockRes()
    await getRecentArticlesController({} as Request, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  it('getUpcomingEvents retourne les événements', async () => {
    const res = mockRes()
    await getUpcomingEventsController({} as Request, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('adminController — getUsers', () => {
  it('retourne la liste des admins', async () => {
    const res = mockRes()
    await getUsers({} as Request, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.arrayContaining([expect.objectContaining({ id: 1 })]) }),
    )
  })
})

describe('adminController — createUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si nom invalide', async () => {
    const req = { body: { nom: '', email: 'a@test.com', motDePasse: '123456' } } as Request
    const res = mockRes()
    await createUser(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 400 si email invalide', async () => {
    const req = { body: { nom: 'Admin', email: 'pas-email', motDePasse: '123456' } } as Request
    const res = mockRes()
    await createUser(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 400 si motDePasse trop court', async () => {
    const req = { body: { nom: 'Admin', email: 'a@test.com', motDePasse: '123' } } as Request
    const res = mockRes()
    await createUser(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 201 et crée l\'admin', async () => {
    mockService.creerAdmin.mockResolvedValue({ ok: true, data: { id: 2, nom: 'Admin', email: 'a@test.com' } })
    const req = { body: { nom: 'Admin', email: 'a@test.com', motDePasse: '123456' } } as Request
    const res = mockRes()
    await createUser(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(mockService.creerAdmin).toHaveBeenCalledWith({ nom: 'Admin', email: 'a@test.com', motDePasse: '123456', role: undefined })
  })
})

describe('adminController — updateUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' }, body: {} } as unknown as Request
    const res = mockRes()
    await updateUser(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('met à jour l\'admin', async () => {
    mockService.modifierAdmin.mockResolvedValue({ ok: true, data: { id: 1, nom: 'Nouveau' } })
    const req = { params: { id: '1' }, body: { nom: 'Nouveau' } } as unknown as Request
    const res = mockRes()
    await updateUser(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('adminController — resetUserPassword', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' }, body: {} } as unknown as Request
    const res = mockRes()
    await resetUserPassword(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 400 si motDePasse trop court', async () => {
    const req = { params: { id: '1' }, body: { nouveauMotDePasse: '123' } } as unknown as Request
    const res = mockRes()
    await resetUserPassword(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('réinitialise le mot de passe', async () => {
    mockService.reinitialiserMotDePasse.mockResolvedValue({ ok: true, message: 'Réinitialisé' })
    const req = { params: { id: '1' }, body: { nouveauMotDePasse: 'nouveau123' } } as unknown as Request
    const res = mockRes()
    await resetUserPassword(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('adminController — updateProfilePassword', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 401 si non authentifié', async () => {
    const req = { user: undefined, body: {} } as unknown as Request
    const res = mockRes()
    await updateProfilePassword(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('retourne 400 si motDePasseActuel manquant', async () => {
    const req = { user: { id: 1 }, body: { nouveauMotDePasse: 'new123456' } } as unknown as Request
    const res = mockRes()
    await updateProfilePassword(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 400 si nouveauMotDePasse trop court', async () => {
    const req = { user: { id: 1 }, body: { motDePasseActuel: 'old123', nouveauMotDePasse: '123' } } as unknown as Request
    const res = mockRes()
    await updateProfilePassword(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('change le mot de passe', async () => {
    mockService.changerMotDePasse.mockResolvedValue({ ok: true, message: 'Mot de passe changé' })
    const req = { user: { id: 1 }, body: { motDePasseActuel: 'old123', nouveauMotDePasse: 'new123456' } } as unknown as Request
    const res = mockRes()
    await updateProfilePassword(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})
