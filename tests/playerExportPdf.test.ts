// Tests unitaires — GET /admin/players/:id/export-pdf — BFA Bille Football Academy
// Prisma et la génération PDF sont mockés : on vérifie le contrat HTTP du contrôleur
// (400 id invalide, 404 joueur absent, en-têtes + buffer, 500 si le rendu échoue).

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPrisma, mockGenerer } = vi.hoisted(() => ({
  mockPrisma: { joueur: { findUnique: vi.fn() } },
  mockGenerer: vi.fn(),
}))

vi.mock('../src/config/database', () => ({ default: mockPrisma }))
vi.mock('../src/services/pdfService', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  genererFicheJoueurPdf: mockGenerer,
}))

import { exportPdf } from '../src/controllers/playerController'
import { slugFichier, ficheJoueurHtml } from '../src/services/pdfService'
import type { Request, Response } from 'express'

function mockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as Response
}

const joueurFixture = {
  id: 106, nom: 'Etoa', prenom: 'Lucas', dateNaissance: new Date('2016-01-15'),
  poste: 'Défenseur', photo: null, dateArrivee: new Date('2024-09-01'),
  categorieId: 34, categorie: { id: 34, nom: 'U9', ageMin: 8, ageMax: 9 },
}

function reqAvecId(id: string): Request {
  return { params: { id } } as unknown as Request
}

describe('playerController — exportPdf', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renvoie 400 si l’identifiant est invalide', async () => {
    const res = mockRes()
    await exportPdf(reqAvecId('abc'), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('renvoie 404 si le joueur est introuvable', async () => {
    mockPrisma.joueur.findUnique.mockResolvedValue(null)
    const res = mockRes()
    await exportPdf(reqAvecId('999'), res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('renvoie le PDF avec les en-têtes attachment', async () => {
    mockPrisma.joueur.findUnique.mockResolvedValue(joueurFixture)
    mockGenerer.mockResolvedValue(Buffer.from('%PDF-fake'))
    const res = mockRes()

    await exportPdf(reqAvecId('106'), res)

    expect(mockGenerer).toHaveBeenCalledWith(joueurFixture)
    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Type': 'application/pdf',
        'Content-Disposition': expect.stringContaining('fiche-joueur-etoa-lucas.pdf'),
      }),
    )
    expect(res.send).toHaveBeenCalledWith(expect.any(Buffer))
  })

  it('renvoie 500 si la génération échoue', async () => {
    mockPrisma.joueur.findUnique.mockResolvedValue(joueurFixture)
    mockGenerer.mockRejectedValue(new Error('Chromium introuvable'))
    const res = mockRes()

    await exportPdf(reqAvecId('106'), res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    )
  })
})

describe('pdfService — slugFichier', () => {
  it('retire accents et caractères spéciaux', () => {
    expect(slugFichier('N’Dembélé Éto’o')).toBe('n-dembele-eto-o')
    expect(slugFichier('!!!')).toBe('joueur')
  })
})

describe('pdfService — ficheJoueurHtml', () => {
  it('échappe les valeurs injectées dans le template', async () => {
    const html = ficheJoueurHtml({ ...joueurFixture, nom: '<script>x' })
    expect(html).not.toContain('<script>x')
    expect(html).toContain('&lt;SCRIPT&gt;X') // le nom est affiché en majuscules, puis échappé
    expect(html).toContain('Lucas')
    expect(html).toContain('U9')
  })
})
