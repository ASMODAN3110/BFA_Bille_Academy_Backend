import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPrisma, mockSignToken, mockBcryptCompare } = vi.hoisted(() => ({
  mockPrisma: {
    administrateur: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  mockSignToken: vi.fn().mockReturnValue('fake.jwt.token'),
  mockBcryptCompare: vi.fn(),
}))

vi.mock('../src/config/database', () => ({ default: mockPrisma }))
vi.mock('../src/services/jwtService', () => ({ signToken: mockSignToken }))
vi.mock('bcryptjs', () => ({ default: { compare: mockBcryptCompare } }))

import { login, logout } from '../src/controllers/authController'
import type { Request, Response } from 'express'

function mockRes(): Response {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as unknown as Response
}

describe('authController — login', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 400 si email invalide', async () => {
    const req = { body: { email: 'pas-email', motDePasse: 'abc' } } as Request
    const res = mockRes()
    await login(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 400 si motDePasse manquant', async () => {
    const req = { body: { email: 'admin@test.com' } } as Request
    const res = mockRes()
    await login(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('retourne 401 si l\'admin n\'existe pas', async () => {
    mockPrisma.administrateur.findUnique.mockResolvedValue(null)
    const req = { body: { email: 'admin@test.com', motDePasse: 'abc' } } as Request
    const res = mockRes()
    await login(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Identifiants incorrects' }),
    )
  })

  it('retourne 401 si le mot de passe est incorrect', async () => {
    mockPrisma.administrateur.findUnique.mockResolvedValue({ id: 1, motDePasse: 'hashed' })
    mockBcryptCompare.mockResolvedValue(false)
    const req = { body: { email: 'admin@test.com', motDePasse: 'wrong' } } as Request
    const res = mockRes()
    await login(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('retourne 200 avec token et user si identifiants corrects', async () => {
    const admin = { id: 1, nom: 'Admin', email: 'admin@test.com', role: 'SUPER_ADMIN', motDePasse: 'hashed' }
    mockPrisma.administrateur.findUnique.mockResolvedValue(admin)
    mockBcryptCompare.mockResolvedValue(true)
    mockPrisma.administrateur.update.mockResolvedValue({})
    const req = { body: { email: 'admin@test.com', motDePasse: 'correct' } } as Request
    const res = mockRes()
    await login(req, res)
    expect(mockSignToken).toHaveBeenCalledWith({ id: 1, email: 'admin@test.com', role: 'SUPER_ADMIN' })
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        token: 'fake.jwt.token',
        user: expect.objectContaining({ id: 1, email: 'admin@test.com' }),
      }),
    )
  })

  it('met à jour derniereConnexion', async () => {
    const admin = { id: 1, nom: 'Admin', email: 'admin@test.com', role: 'ADMIN', motDePasse: 'hashed' }
    mockPrisma.administrateur.findUnique.mockResolvedValue(admin)
    mockBcryptCompare.mockResolvedValue(true)
    mockPrisma.administrateur.update.mockResolvedValue({})
    const req = { body: { email: 'admin@test.com', motDePasse: 'correct' } } as Request
    const res = mockRes()
    await login(req, res)
    expect(mockPrisma.administrateur.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ derniereConnexion: expect.any(Date) }),
      }),
    )
  })
})

describe('authController — logout', () => {
  it('retourne success', () => {
    const res = mockRes()
    logout({} as Request, res)
    expect(res.json).toHaveBeenCalledWith({ success: true })
  })
})
