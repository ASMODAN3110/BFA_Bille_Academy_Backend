import { describe, it, expect } from 'vitest'
import { validateTeamSheetCreate, validateTeamSheetUpdate } from '../src/utils/teamSheetValidator'

describe('validateTeamSheetCreate', () => {
  it('retourne [] pour un body valide', () => {
    expect(validateTeamSheetCreate({ categorieId: 34, saison: '2025-2026' })).toEqual([])
  })

  it('retourne [] avec staff, palmares, objectifs', () => {
    expect(validateTeamSheetCreate({
      categorieId: 34, saison: '2025-2026',
      staff: 'Coach: Jean', palmares: 'Champion 2024', objectifs: 'Top 3',
    })).toEqual([])
  })

  it('erreur si categorieId manquant ou invalide', () => {
    expect(validateTeamSheetCreate({ saison: '2025-2026' }).some((m) => /catégorie/i.test(m))).toBe(true)
    expect(validateTeamSheetCreate({ categorieId: 'x', saison: '2025-2026' }).some((m) => /catégorie/i.test(m))).toBe(true)
    expect(validateTeamSheetCreate({ categorieId: 0, saison: '2025-2026' }).some((m) => /catégorie/i.test(m))).toBe(true)
  })

  it('erreur si saison manquante', () => {
    expect(validateTeamSheetCreate({ categorieId: 34 }).some((m) => /saison/i.test(m))).toBe(true)
  })

  it('erreur si saison mauvais format', () => {
    expect(validateTeamSheetCreate({ categorieId: 34, saison: '2025/2026' }).some((m) => /AAAA-AAAA/i.test(m))).toBe(true)
    expect(validateTeamSheetCreate({ categorieId: 34, saison: '2025' }).some((m) => /AAAA-AAAA/i.test(m))).toBe(true)
    expect(validateTeamSheetCreate({ categorieId: 34, saison: '20252026' }).some((m) => /AAAA-AAAA/i.test(m))).toBe(true)
  })

  it('erreur si staff non chaîne', () => {
    const e = validateTeamSheetCreate({ categorieId: 34, saison: '2025-2026', staff: 123 })
    expect(e.some((m) => /staff/i.test(m))).toBe(true)
  })

  it('erreur si palmares non chaîne', () => {
    const e = validateTeamSheetCreate({ categorieId: 34, saison: '2025-2026', palmares: 123 })
    expect(e.some((m) => /palmares/i.test(m))).toBe(true)
  })

  it('erreur si objectifs non chaîne', () => {
    const e = validateTeamSheetCreate({ categorieId: 34, saison: '2025-2026', objectifs: 123 })
    expect(e.some((m) => /objectifs/i.test(m))).toBe(true)
  })
})

describe('validateTeamSheetUpdate (partiel)', () => {
  it('retourne [] si aucun champ fourni', () => {
    expect(validateTeamSheetUpdate({}, true)).toEqual([])
  })

  it('valide uniquement les champs fournis', () => {
    expect(validateTeamSheetUpdate({ staff: 'Nouveau coach' }, true)).toEqual([])
    expect(validateTeamSheetUpdate({ staff: 123 }, true).some((m) => /staff/i.test(m))).toBe(true)
  })

  it('ignore saison si non fournie en partiel', () => {
    expect(validateTeamSheetUpdate({ staff: 'x' }, true)).toEqual([])
  })

  it('valide saison si fournie en partiel', () => {
    expect(validateTeamSheetUpdate({ saison: '2025/2026' }, true).some((m) => /AAAA-AAAA/i.test(m))).toBe(true)
  })
})

describe('validateTeamSheetUpdate (complet)', () => {
  it('exige la saison en mode complet', () => {
    const e = validateTeamSheetUpdate({ staff: 'x' }, false)
    expect(e.some((m) => /saison/i.test(m))).toBe(true)
  })

  it('valide tous les champs en mode complet', () => {
    expect(validateTeamSheetUpdate({ staff: 'x', palmares: 'y', objectifs: 'z', saison: '2025-2026' }, false)).toEqual([])
  })
})
