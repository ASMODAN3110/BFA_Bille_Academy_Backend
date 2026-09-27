import { describe, it, expect } from 'vitest'
import { validateResultCreate, TYPES_MATCH } from '../src/utils/resultValidator'

const base = {
  equipeA: 'FC Union', equipeB: 'AS Nord', scoreA: 2, scoreB: 1,
  date: '2026-10-01', type: 'CHAMPIONNAT', categorieId: 34,
}

describe('validateResultCreate', () => {
  it('retourne [] pour un body valide', () => {
    expect(validateResultCreate(base)).toEqual([])
  })

  it('accepte les scores sous forme de chaîne', () => {
    expect(validateResultCreate({ ...base, scoreA: '2', scoreB: '0' })).toEqual([])
  })

  it('accepte typeMatch AMICAL et CHAMPIONNAT', () => {
    for (const t of TYPES_MATCH) {
      expect(validateResultCreate({ ...base, type: t })).toEqual([])
    }
  })

  it('erreur si equipeA manquante ou courte', () => {
    expect(validateResultCreate({ ...base, equipeA: '' }).some((m) => /domicile/i.test(m))).toBe(true)
    expect(validateResultCreate({ ...base, equipeA: 'A' }).some((m) => /domicile/i.test(m))).toBe(true)
  })

  it('erreur si equipeB manquante ou courte', () => {
    expect(validateResultCreate({ ...base, equipeB: '' }).some((m) => /adverse/i.test(m))).toBe(true)
    expect(validateResultCreate({ ...base, equipeB: 'B' }).some((m) => /adverse/i.test(m))).toBe(true)
  })

  it('erreur si scoreA invalide', () => {
    expect(validateResultCreate({ ...base, scoreA: -1 }).some((m) => /scoreA/i.test(m))).toBe(true)
    expect(validateResultCreate({ ...base, scoreA: 1.5 }).some((m) => /scoreA/i.test(m))).toBe(true)
    expect(validateResultCreate({ ...base, scoreA: true }).some((m) => /scoreA/i.test(m))).toBe(true)
  })

  it('erreur si scoreB invalide', () => {
    expect(validateResultCreate({ ...base, scoreB: -1 }).some((m) => /scoreB/i.test(m))).toBe(true)
    expect(validateResultCreate({ ...base, scoreB: 1.5 }).some((m) => /scoreB/i.test(m))).toBe(true)
  })

  it('erreur si date invalide', () => {
    expect(validateResultCreate({ ...base, date: 'abc' }).some((m) => /date/i.test(m))).toBe(true)
    expect(validateResultCreate({ ...base, date: '' }).some((m) => /date/i.test(m))).toBe(true)
  })

  it('erreur si type invalide', () => {
    expect(validateResultCreate({ ...base, type: 'AUTRE' }).some((m) => /type/i.test(m))).toBe(true)
    expect(validateResultCreate({ ...base, type: '' }).some((m) => /type/i.test(m))).toBe(true)
  })

  it('erreur si categorieId invalide', () => {
    expect(validateResultCreate({ ...base, categorieId: 0 }).some((m) => /catégorie/i.test(m))).toBe(true)
    expect(validateResultCreate({ ...base, categorieId: -1 }).some((m) => /catégorie/i.test(m))).toBe(true)
    expect(validateResultCreate({ ...base, categorieId: 'x' }).some((m) => /catégorie/i.test(m))).toBe(true)
    expect(validateResultCreate({ ...base, categorieId: true }).some((m) => /catégorie/i.test(m))).toBe(true)
  })

  it('erreur si les deux équipes sont identiques', () => {
    const e = validateResultCreate({ ...base, equipeB: 'FC Union' })
    expect(e.some((m) => /différentes/i.test(m))).toBe(true)
  })

  it('erreur si les deux équipes sont identiques (casse différente)', () => {
    const e = validateResultCreate({ ...base, equipeB: 'fc union' })
    expect(e.some((m) => /différentes/i.test(m))).toBe(true)
  })
})
