import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockService } = vi.hoisted(() => ({
  mockService: {
    listerAlbums: vi.fn(),
    obtenirAlbum: vi.fn(),
    creerAlbum: vi.fn(),
    modifierAlbum: vi.fn(),
    supprimerAlbum: vi.fn(),
    ajouterMedias: vi.fn(),
    supprimerMedia: vi.fn(),
  },
}))

vi.mock('../src/services/albumService', () => mockService)

import { getAll, getById, create, update, remove, uploadMedia, deleteMedia } from '../src/controllers/albumController'
import type { Request, Response } from 'express'

function mockRes(): Response {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as unknown as Response
}

const albumFixture = {
  id: 1, titre: 'Album 2025', description: 'Photos', theme: 'Matchs',
  medias: [], administrateurId: 6, dateCreation: new Date(),
}

describe('albumController — getAll', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne les albums paginés', async () => {
    mockService.listerAlbums.mockResolvedValue({
      ok: true, data: { items: [albumFixture], total: 1, page: 1, limit: 10, totalPages: 1 },
    })
    const req = { query: {} } as unknown as Request
    const res = mockRes()
    await getAll(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  it('filtre par thème', async () => {
    mockService.listerAlbums.mockResolvedValue({ ok: true, data: { items: [] } })
    const req = { query: { theme: 'Matchs' } } as unknown as Request
    const res = mockRes()
    await getAll(req, res)
    expect(mockService.listerAlbums).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'Matchs' }),
    )
  })

  it('retourne 400 si le thème est invalide', async () => {
    const req = { query: { theme: 'Invalide' } } as unknown as Request
    const res = mockRes()
    await getAll(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('albumController — getById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' } } as unknown as Request
    const res = mockRes()
    await getById(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si l\'album n\'existe pas', async () => {
    mockService.obtenirAlbum.mockResolvedValue({ ok: false, message: 'Introuvable' })
    const req = { params: { id: '999' } } as unknown as Request
    const res = mockRes()
    await getById(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('retourne l\'album', async () => {
    mockService.obtenirAlbum.mockResolvedValue({ ok: true, data: albumFixture })
    const req = { params: { id: '1' } } as unknown as Request
    const res = mockRes()
    await getById(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: albumFixture }),
    )
  })
})

describe('albumController — create', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si le body est invalide', async () => {
    const req = { body: { titre: 'AB' } } as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 201 et crée l\'album', async () => {
    mockService.creerAlbum.mockResolvedValue({ ok: true, data: albumFixture })
    const req = { body: { titre: 'Album', theme: 'Matchs' }, user: { id: 6 } } as unknown as Request
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(mockService.creerAlbum).toHaveBeenCalledWith(req.body, 6)
  })
})

describe('albumController — update', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' }, body: {} } as unknown as Request
    const res = mockRes()
    await update(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('met à jour l\'album', async () => {
    mockService.modifierAlbum.mockResolvedValue({ ok: true, data: albumFixture })
    const req = { params: { id: '1' }, body: { titre: 'Album 2026', theme: 'Portraits' } } as unknown as Request
    const res = mockRes()
    await update(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('albumController — remove', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si l\'album n\'existe pas', async () => {
    mockService.supprimerAlbum.mockResolvedValue({ ok: false, message: 'Introuvable' })
    const req = { params: { id: '999' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('supprime l\'album', async () => {
    mockService.supprimerAlbum.mockResolvedValue({ ok: true })
    const req = { params: { id: '1' } } as unknown as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Album supprimé.' }),
    )
  })
})

describe('albumController — uploadMedia', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' }, files: [] } as unknown as Request
    const res = mockRes()
    await uploadMedia(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 400 si aucun fichier', async () => {
    const req = { params: { id: '1' }, files: [] } as unknown as Request
    const res = mockRes()
    await uploadMedia(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('ajoute les médias à l\'album', async () => {
    mockService.ajouterMedias.mockResolvedValue({ ok: true, data: { ...albumFixture, medias: ['img1.webp'] } })
    const req = {
      params: { id: '1' },
      files: [{ buffer: Buffer.from('x'), mimetype: 'image/jpeg', originalname: 'img.jpg' }],
    } as unknown as Request
    const res = mockRes()
    await uploadMedia(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('albumController — deleteMedia', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si albumId invalide', async () => {
    const req = { params: { albumId: 'x', mediaId: 'y' } } as unknown as Request
    const res = mockRes()
    await deleteMedia(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 400 si mediaId vide', async () => {
    const req = { params: { albumId: '1', mediaId: '' } } as unknown as Request
    const res = mockRes()
    await deleteMedia(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('supprime le média', async () => {
    mockService.supprimerMedia.mockResolvedValue({ ok: true, data: albumFixture })
    const req = { params: { albumId: '1', mediaId: 'm1' } } as unknown as Request
    const res = mockRes()
    await deleteMedia(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Média supprimé.' }),
    )
    expect(mockService.supprimerMedia).toHaveBeenCalledWith(1, 'm1')
  })
})
