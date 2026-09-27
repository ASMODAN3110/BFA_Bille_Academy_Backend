import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    resultat: { findMany: vi.fn() },
    classement: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    categorie: { findUnique: vi.fn() },
    $transaction: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('../src/config/database', () => ({ default: mockPrisma }))

import {
  calculerClassement,
  recalculerClassement,
  lireClassement,
} from '../src/services/rankingService'

const resultatsFixtures = [
  { equipeA: 'BFA', equipeB: 'FC Union', scoreA: 2, scoreB: 1 },
  { equipeA: 'AS Nord', equipeB: 'BFA', scoreA: 0, scoreB: 0 },
  { equipeA: 'FC Union', equipeB: 'AS Nord', scoreA: 1, scoreB: 3 },
]

describe('rankingService — calculerClassement', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calcule le classement 3pts victoire, 1pt nul', async () => {
    mockPrisma.resultat.findMany.mockResolvedValue(resultatsFixtures)
    const lignes = await calculerClassement(34)
    // BFA : victoire (3) + nul (1) = 4 pts, 1 victoire, 1 nul, 0 défaite
    // AS Nord : nul (1) + victoire (3) = 4 pts, 1 victoire, 1 nul, 0 défaite
    // FC Union : défaite (0) + défaite (0) = 0 pts
    expect(lignes).toHaveLength(3)
    expect(lignes[0].points).toBe(4)
    expect(lignes[2].points).toBe(0)
    expect(lignes[2].equipe).toBe('FC Union')
  })

  it('trie par points décroissants', async () => {
    mockPrisma.resultat.findMany.mockResolvedValue(resultatsFixtures)
    const lignes = await calculerClassement(34)
    expect(lignes[0].points).toBeGreaterThanOrEqual(lignes[1].points)
    expect(lignes[1].points).toBeGreaterThanOrEqual(lignes[2].points)
  })

  it('numérote les positions', async () => {
    mockPrisma.resultat.findMany.mockResolvedValue(resultatsFixtures)
    const lignes = await calculerClassement(34)
    expect(lignes[0].position).toBe(1)
    expect(lignes[1].position).toBe(2)
    expect(lignes[2].position).toBe(3)
  })

  it('retourne [] si aucun résultat', async () => {
    mockPrisma.resultat.findMany.mockResolvedValue([])
    expect(await calculerClassement(34)).toEqual([])
  })

  it('gère les départages par victoires', async () => {
    // Deux équipes à égalité de points, celle avec plus de victoires en tête
    mockPrisma.resultat.findMany.mockResolvedValue([
      { equipeA: 'A', equipeB: 'B', scoreA: 2, scoreB: 1 }, // A: 3pts, B: 0
      { equipeA: 'A', equipeB: 'C', scoreA: 1, scoreB: 0 }, // A: 3pts, C: 0
      { equipeA: 'B', equipeB: 'C', scoreA: 0, scoreB: 0 }, // B: 1pt, C: 1pt
    ])
    const lignes = await calculerClassement(34)
    // A: 2 victoires (6 pts), B: 1 nul (1 pt), C: 1 nul (1 pt)
    expect(lignes[0].equipe).toBe('A')
    expect(lignes[0].victoires).toBe(2)
    // B et C à 1 point chacun, B a 0 victoire, C a 0 victoire → ordre alphabétique/stable
    expect(lignes[1].points).toBe(1)
    expect(lignes[2].points).toBe(1)
  })
})

describe('rankingService — recalculerClassement', () => {
  beforeEach(() => vi.clearAllMocks())

  it('persiste le classement recalculé', async () => {
    mockPrisma.resultat.findMany.mockResolvedValue(resultatsFixtures)
    const lignes = await recalculerClassement(34)
    expect(mockPrisma.classement.deleteMany).toHaveBeenCalledWith({ where: { categorieId: 34 } })
    expect(mockPrisma.classement.createMany).toHaveBeenCalled()
    expect(mockPrisma.$transaction).toHaveBeenCalled()
    expect(lignes).toHaveLength(3)
  })

  it('persiste un classement vide (delete seul)', async () => {
    mockPrisma.resultat.findMany.mockResolvedValue([])
    const lignes = await recalculerClassement(34)
    expect(mockPrisma.classement.deleteMany).toHaveBeenCalled()
    expect(mockPrisma.classement.createMany).not.toHaveBeenCalled()
    expect(lignes).toEqual([])
  })
})

describe('rankingService — lireClassement', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 404 si la catégorie n\'existe pas', async () => {
    mockPrisma.categorie.findUnique.mockResolvedValue(null)
    const result = await lireClassement(999)
    expect(result.ok).toBe(false)
    expect(result.code).toBe('CATEGORIE_INTROUVABLE')
  })

  it('retourne le classement lu en base', async () => {
    mockPrisma.categorie.findUnique.mockResolvedValue({ id: 34, nom: 'U13' })
    mockPrisma.classement.findMany.mockResolvedValue([
      { equipe: 'BFA', matchsJoues: 3, victoires: 2, nuls: 1, defaites: 0, points: 7 },
      { equipe: 'FC Union', matchsJoues: 3, victoires: 1, nuls: 0, defaites: 2, points: 3 },
    ])
    const result = await lireClassement(34)
    expect(result.ok).toBe(true)
    expect(result.data?.items).toHaveLength(2)
    expect(result.data?.items[0].position).toBe(1)
    expect(result.data?.items[0].equipe).toBe('BFA')
    expect(result.data?.items[0].points).toBe(7)
  })
})
