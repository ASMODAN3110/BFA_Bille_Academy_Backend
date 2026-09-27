import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUploadFile, mockUploadMany, mockDeleteFile } = vi.hoisted(() => ({
  mockUploadFile: vi.fn().mockResolvedValue({ key: 'joueurs/img.webp', url: 'https://s3.example.com/joueurs/img.webp' }),
  mockUploadMany: vi.fn().mockResolvedValue([
    { key: 'galerie/1.webp', url: 'https://s3.example.com/galerie/1.webp' },
    { key: 'galerie/2.webp', url: 'https://s3.example.com/galerie/2.webp' },
  ]),
  mockDeleteFile: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../src/services/storageService', () => ({
  uploadFile: mockUploadFile,
  uploadMany: mockUploadMany,
  deleteFile: mockDeleteFile,
}))
vi.mock('../src/config/s3', () => ({
  BUCKET: 'bfa-media',
  S3_PUBLIC_URL: 'https://s3.example.com',
}))
vi.mock('../src/middlewares/uploadMiddleware', () => ({
  estDossierValide: vi.fn().mockImplementation((d: string) => ['joueurs', 'galerie', 'blog', 'boutique'].includes(d)),
}))

import { upload, uploadMultiple, remove } from '../src/controllers/mediaController'
import type { Request, Response } from 'express'

function mockRes(): Response {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as unknown as Response
}

describe('mediaController — upload', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si le dossier est invalide', async () => {
    const req = { body: { dossier: 'autre' }, file: { buffer: Buffer.from('x'), mimetype: 'image/jpeg', originalname: 'img.jpg' } } as unknown as Request
    const res = mockRes()
    await upload(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 400 si aucun fichier', async () => {
    const req = { body: { dossier: 'joueurs' } } as unknown as Request
    const res = mockRes()
    await upload(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 201 avec key et url', async () => {
    const req = {
      body: { dossier: 'joueurs' },
      file: { buffer: Buffer.from('x'), mimetype: 'image/jpeg', originalname: 'img.jpg' },
    } as unknown as Request
    const res = mockRes()
    await upload(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ key: 'joueurs/img.webp' }) }),
    )
  })
})

describe('mediaController — uploadMultiple', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si le dossier est invalide', async () => {
    const req = { body: { dossier: 'autre' }, files: [{ buffer: Buffer.from('x') }] } as unknown as Request
    const res = mockRes()
    await uploadMultiple(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 400 si aucun fichier', async () => {
    const req = { body: { dossier: 'galerie' }, files: [] } as unknown as Request
    const res = mockRes()
    await uploadMultiple(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 201 avec la liste des médias', async () => {
    const req = {
      body: { dossier: 'galerie' },
      files: [
        { buffer: Buffer.from('a'), mimetype: 'image/jpeg', originalname: '1.jpg' },
        { buffer: Buffer.from('b'), mimetype: 'image/jpeg', originalname: '2.jpg' },
      ],
    } as unknown as Request
    const res = mockRes()
    await uploadMultiple(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.arrayContaining([expect.objectContaining({ key: 'galerie/1.webp' })]) }),
    )
  })
})

describe('mediaController — remove', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si ni key ni url', async () => {
    const req = { body: {} } as Request
    const res = mockRes()
    await remove(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('supprime par key', async () => {
    const req = { body: { key: 'joueurs/img.webp' } } as Request
    const res = mockRes()
    await remove(req, res)
    expect(mockDeleteFile).toHaveBeenCalledWith('joueurs/img.webp')
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Fichier supprimé' }),
    )
  })

  it('supprime par url (extrait la clé)', async () => {
    const req = { body: { url: 'https://s3.example.com/bfa-media/joueurs/img.webp' } } as Request
    const res = mockRes()
    await remove(req, res)
    expect(mockDeleteFile).toHaveBeenCalledWith('joueurs/img.webp')
  })

  it('accepte une clé qui ne correspond pas au préfixe URL', async () => {
    const req = { body: { url: 'joueurs/img.webp' } } as Request
    const res = mockRes()
    await remove(req, res)
    expect(mockDeleteFile).toHaveBeenCalledWith('joueurs/img.webp')
  })
})
