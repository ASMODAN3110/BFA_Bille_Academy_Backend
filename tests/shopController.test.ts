import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockProductService, mockQuoteService, mockUploadFile } = vi.hoisted(() => ({
  mockProductService: {
    listerProduits: vi.fn(),
    obtenirProduit: vi.fn(),
    creerProduit: vi.fn(),
    modifierProduit: vi.fn(),
    supprimerProduit: vi.fn(),
  },
  mockQuoteService: {
    listerDevis: vi.fn(),
    obtenirDevis: vi.fn(),
    creerDevis: vi.fn(),
    marquerDevisTraite: vi.fn(),
  },
  mockUploadFile: vi.fn().mockResolvedValue({ url: 'https://s3.example.com/boutique/img.webp' }),
}))

vi.mock('../src/services/productService', () => mockProductService)
vi.mock('../src/services/quoteService', () => mockQuoteService)
vi.mock('../src/services/storageService', () => ({ uploadFile: mockUploadFile }))

import {
  getPublicProducts, getProductByIdPublic, getProducts, getProductById,
  createProduct, updateProduct, deleteProduct,
  createQuote, getQuotes, getQuoteById, markQuoteAsTreated,
} from '../src/controllers/shopController'
import type { Request, Response } from 'express'

function mockRes(): Response {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as unknown as Response
}

const produitFixture = {
  id: 1, nom: 'Maillot BFA', description: 'Maillot officiel', prix: 5000,
  tailles: ['S', 'M'], categorie: 'Vêtements', stock: 10, image: null,
  estNouveau: true, estActif: true,
}

const devisFixture = {
  id: 1, nomComplet: 'Jean Dupont', email: 'jean@test.com',
  telephone: '+237690000000', produitId: 1, quantite: 2, taille: 'M',
  message: null, estTraite: false, dateDemande: new Date(),
}

describe('shopController — getPublicProducts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne les produits', async () => {
    mockProductService.listerProduits.mockResolvedValue({
      ok: true, data: { items: [produitFixture], total: 1 },
    })
    const req = { query: {} } as unknown as Request
    const res = mockRes()
    await getPublicProducts(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  it('filtre par catégorie', async () => {
    mockProductService.listerProduits.mockResolvedValue({ ok: true, data: { items: [] } })
    const req = { query: { categorie: 'Vêtements' } } as unknown as Request
    const res = mockRes()
    await getPublicProducts(req, res)
    expect(mockProductService.listerProduits).toHaveBeenCalledWith(
      expect.objectContaining({ categorie: 'Vêtements' }),
    )
  })

  it('retourne 400 si catégorie invalide', async () => {
    const req = { query: { categorie: 'Invalide' } } as unknown as Request
    const res = mockRes()
    await getPublicProducts(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('shopController — getProductByIdPublic', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' } } as unknown as Request
    const res = mockRes()
    await getProductByIdPublic(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 404 si le produit n\'existe pas', async () => {
    mockProductService.obtenirProduit.mockResolvedValue({ ok: false, code: 'PRODUIT_INTROUVABLE' })
    const req = { params: { id: '999' } } as unknown as Request
    const res = mockRes()
    await getProductByIdPublic(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('retourne le produit', async () => {
    mockProductService.obtenirProduit.mockResolvedValue({ ok: true, data: produitFixture })
    const req = { params: { id: '1' } } as unknown as Request
    const res = mockRes()
    await getProductByIdPublic(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: produitFixture }),
    )
  })
})

describe('shopController — createProduct', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si le body est invalide', async () => {
    const req = { body: { nom: 'AB' } } as Request
    const res = mockRes()
    await createProduct(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 201 et crée le produit (sans image)', async () => {
    mockProductService.creerProduit.mockResolvedValue({ ok: true, data: produitFixture })
    const req = {
      body: { nom: 'Maillot', description: 'Maillot officiel BFA', prix: 5000, tailles: ['S'], categorie: 'Vêtements' },
      user: { id: 6 },
    } as unknown as Request
    const res = mockRes()
    await createProduct(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(mockProductService.creerProduit).toHaveBeenCalledWith(req.body, null, 6)
  })

  it('uploade l\'image si req.file présent', async () => {
    mockProductService.creerProduit.mockResolvedValue({ ok: true, data: produitFixture })
    const req = {
      body: { nom: 'Maillot', description: 'Maillot officiel BFA', prix: 5000, tailles: ['S'], categorie: 'Vêtements' },
      file: { buffer: Buffer.from('x'), mimetype: 'image/jpeg', originalname: 'img.jpg' },
      user: { id: 6 },
    } as unknown as Request
    const res = mockRes()
    await createProduct(req, res)
    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ dossier: 'boutique' }),
    )
    expect(mockProductService.creerProduit).toHaveBeenCalledWith(
      req.body, 'https://s3.example.com/boutique/img.webp', 6,
    )
  })
})

describe('shopController — updateProduct', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' }, body: {} } as unknown as Request
    const res = mockRes()
    await updateProduct(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('met à jour le produit', async () => {
    mockProductService.modifierProduit.mockResolvedValue({ ok: true, data: produitFixture })
    const req = {
      params: { id: '1' },
      body: { nom: 'Maillot', description: 'Maillot officiel BFA', prix: 5000, tailles: ['S'], categorie: 'Vêtements' },
      user: { id: 6 },
    } as unknown as Request
    const res = mockRes()
    await updateProduct(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('shopController — deleteProduct', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si l\'id est invalide', async () => {
    const req = { params: { id: 'x' } } as unknown as Request
    const res = mockRes()
    await deleteProduct(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('supprime le produit', async () => {
    mockProductService.supprimerProduit.mockResolvedValue({ ok: true })
    const req = { params: { id: '1' } } as unknown as Request
    const res = mockRes()
    await deleteProduct(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Produit supprimé.' }),
    )
  })
})

describe('shopController — createQuote', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si le body est invalide', async () => {
    const req = { body: { nomComplet: '' } } as Request
    const res = mockRes()
    await createQuote(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 201 et crée le devis', async () => {
    mockQuoteService.creerDevis.mockResolvedValue({ ok: true, data: devisFixture })
    const req = {
      body: {
        nomComplet: 'Jean Dupont', email: 'jean@test.com',
        telephone: '+237690000000', produitId: 1, quantite: 2,
      },
    } as Request
    const res = mockRes()
    await createQuote(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
  })
})

describe('shopController — getQuotes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne les devis paginés', async () => {
    mockQuoteService.listerDevis.mockResolvedValue({ ok: true, data: { items: [devisFixture] } })
    const req = { query: {} } as unknown as Request
    const res = mockRes()
    await getQuotes(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  it('filtre par estTraite', async () => {
    mockQuoteService.listerDevis.mockResolvedValue({ ok: true, data: { items: [] } })
    const req = { query: { estTraite: 'true' } } as unknown as Request
    const res = mockRes()
    await getQuotes(req, res)
    expect(mockQuoteService.listerDevis).toHaveBeenCalledWith(
      expect.objectContaining({ estTraite: true }),
    )
  })
})

describe('shopController — getQuoteById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne le devis', async () => {
    mockQuoteService.obtenirDevis.mockResolvedValue({ ok: true, data: devisFixture })
    const req = { params: { id: '1' } } as unknown as Request
    const res = mockRes()
    await getQuoteById(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('shopController — markQuoteAsTreated', () => {
  beforeEach(() => vi.clearAllMocks())

  it('marque le devis comme traité', async () => {
    mockQuoteService.marquerDevisTraite.mockResolvedValue({ ok: true, data: { ...devisFixture, estTraite: true } })
    const req = { params: { id: '1' }, user: { id: 6 } } as unknown as Request
    const res = mockRes()
    await markQuoteAsTreated(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    expect(mockQuoteService.marquerDevisTraite).toHaveBeenCalledWith(1, 6)
  })
})

describe('shopController — getProducts (admin)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne les produits', async () => {
    mockProductService.listerProduits.mockResolvedValue({ ok: true, data: { items: [produitFixture] } })
    const req = { query: {} } as unknown as Request
    const res = mockRes()
    await getProducts(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('shopController — getProductById (admin)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne le produit', async () => {
    mockProductService.obtenirProduit.mockResolvedValue({ ok: true, data: produitFixture })
    const req = { params: { id: '1' } } as unknown as Request
    const res = mockRes()
    await getProductById(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})
