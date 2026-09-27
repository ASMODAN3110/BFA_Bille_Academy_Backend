import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockService } = vi.hoisted(() => ({
  mockService: {
    listerArticlesPublics: vi.fn(),
    obtenirArticlePublic: vi.fn(),
    listerArticles: vi.fn(),
    obtenirArticle: vi.fn(),
    creerArticle: vi.fn(),
    modifierArticle: vi.fn(),
    modifierArticlePartielle: vi.fn(),
    supprimerArticle: vi.fn(),
  },
}))

vi.mock('../src/services/blogService', () => mockService)

import { getPublic, getPublicById, getAll, getById, create, update, patch, remove } from '../src/controllers/blogController'
import type { Request, Response } from 'express'

function mockRes(): Response {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as unknown as Response
}

const articleFixture = {
  id: 1, titre: 'Victoire BFA', contenu: '<p>Match gagné</p>',
  categorie: 'MATCHS', auteur: 'Admin', image: null,
  estPublie: true, datePublication: new Date(), administrateurId: 6,
  extrait: 'Match gagné',
}

describe('blogController — getPublic', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne les articles publiés', async () => {
    mockService.listerArticlesPublics.mockResolvedValue({
      ok: true,
      data: { items: [articleFixture], total: 1, page: 1, limit: 10, totalPages: 1 },
    })
    const req = { query: {} } as unknown as Request
    const res = mockRes()
    await getPublic(req, res)
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { items: [articleFixture], total: 1, page: 1, limit: 10, totalPages: 1 },
    })
  })

  it('retourne 400 si la catégorie est invalide', async () => {
    const req = { query: { categorie: 'INVALIDE' } } as unknown as Request
    const res = mockRes()
    await getPublic(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('filtre par catégorie valide', async () => {
    mockService.listerArticlesPublics.mockResolvedValue({
      ok: true,
      data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 },
    })
    const req = { query: { categorie: 'MATCHS' } } as unknown as Request
    const res = mockRes()
    await getPublic(req, res)
    expect(mockService.listerArticlesPublics).toHaveBeenCalledWith(
      expect.objectContaining({ categorie: 'MATCHS' }),
    )
  })
})

describe('blogController — getPublicById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'abc' } } as unknown as Request
    const res = mockRes()
    await getPublicById(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si l\'article n\'existe pas', async () => {
    mockService.obtenirArticlePublic.mockResolvedValue({
      ok: false, code: 'ARTICLE_INTROUVABLE', message: 'Article introuvable ou non publié.',
    })
    const req = { params: { id: '999' } } as unknown as Request
    const res = mockRes()
    await getPublicById(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('retourne l\'article publié', async () => {
    mockService.obtenirArticlePublic.mockResolvedValue({ ok: true, data: articleFixture })
    const req = { params: { id: '1' } } as unknown as Request
    const res = mockRes()
    await getPublicById(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: articleFixture }),
    )
  })
})

describe('blogController — create', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si le body est invalide', async () => {
    const req = { body: { titre: 'Ab' } } as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 201 et crée l\'article (contenu sanitisé)', async () => {
    mockService.creerArticle.mockResolvedValue({ ok: true, data: articleFixture })
    const req = {
      body: {
        titre: 'Victoire BFA',
        contenu: '<p>Match gagné par BFA cette semaine</p>',
        categorie: 'MATCHS',
        auteur: 'Admin',
      },
      user: { id: 6 },
    } as unknown as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(mockService.creerArticle).toHaveBeenCalledWith(req.body, 6)
  })
})

describe('blogController — update', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' }, body: {} } as unknown as Request
    const res = mockRes()
    await update(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 400 si le body est invalide', async () => {
    const req = { params: { id: '1' }, body: { titre: '' } } as unknown as Request
    const res = mockRes()
    await update(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('met à jour l\'article', async () => {
    mockService.modifierArticle.mockResolvedValue({ ok: true, data: articleFixture })
    const req = {
      params: { id: '1' },
      body: {
        titre: 'Victoire BFA',
        contenu: '<p>Contenu valide et suffisamment long</p>',
        categorie: 'MATCHS',
        auteur: 'Admin',
      },
      user: { id: 6 },
    } as unknown as Request
    const res = mockRes()
    await update(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    )
  })
})

describe('blogController — patch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' }, body: {} } as unknown as Request
    const res = mockRes()
    await patch(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('publie un article via estPublie', async () => {
    mockService.modifierArticlePartielle.mockResolvedValue({
      ok: true, data: { ...articleFixture, estPublie: true },
    })
    const req = {
      params: { id: '1' },
      body: { estPublie: true },
      user: { id: 6 },
    } as unknown as Request
    const res = mockRes()
    await patch(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    )
    expect(mockService.modifierArticlePartielle).toHaveBeenCalledWith(1, { estPublie: true }, 6)
  })
})

describe('blogController — remove', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'abc' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si l\'article n\'existe pas', async () => {
    mockService.supprimerArticle.mockResolvedValue({
      ok: false, code: 'ARTICLE_INTROUVABLE', message: 'Article introuvable.',
    })
    const req = { params: { id: '999' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('supprime l\'article', async () => {
    mockService.supprimerArticle.mockResolvedValue({ ok: true })
    const req = { params: { id: '1' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Article supprimé.' }),
    )
  })
})

describe('blogController — getAll (admin)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne tous les articles (publiés + brouillons)', async () => {
    mockService.listerArticles.mockResolvedValue({
      ok: true,
      data: { items: [articleFixture], total: 1, page: 1, limit: 10, totalPages: 1 },
    })
    const req = { query: {} } as unknown as Request
    const res = mockRes()
    await getAll(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  it('filtre par estPublie', async () => {
    mockService.listerArticles.mockResolvedValue({
      ok: true,
      data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 },
    })
    const req = { query: { estPublie: 'true' } } as unknown as Request
    const res = mockRes()
    await getAll(req, res)
    expect(mockService.listerArticles).toHaveBeenCalledWith(
      expect.objectContaining({ estPublie: true }),
    )
  })

  it('filtre par recherche', async () => {
    mockService.listerArticles.mockResolvedValue({
      ok: true,
      data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 },
    })
    const req = { query: { recherche: 'victoire' } } as unknown as Request
    const res = mockRes()
    await getAll(req, res)
    expect(mockService.listerArticles).toHaveBeenCalledWith(
      expect.objectContaining({ recherche: 'victoire' }),
    )
  })
})

describe('blogController — getById (admin)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' } } as unknown as Request
    const res = mockRes()
    await getById(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si l\'article n\'existe pas', async () => {
    mockService.obtenirArticle.mockResolvedValue({
      ok: false, code: 'ARTICLE_INTROUVABLE', message: 'Article introuvable.',
    })
    const req = { params: { id: '999' } } as unknown as Request
    const res = mockRes()
    await getById(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('retourne l\'article quel que soit son statut', async () => {
    mockService.obtenirArticle.mockResolvedValue({ ok: true, data: articleFixture })
    const req = { params: { id: '1' } } as unknown as Request
    const res = mockRes()
    await getById(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: articleFixture }),
    )
  })
})
