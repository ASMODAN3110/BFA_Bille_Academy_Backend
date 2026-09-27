import { describe, it, expect } from 'vitest'
import { validateEventInput } from '../src/utils/eventValidator'

const base = {
  titre: 'Entraînement U13', date: '2026-10-01', heure: '15:30',
  lieu: 'Stade BFA', type: 'ENTRAINEMENT', categorieId: 34,
}

describe('validateEventInput', () => {
  it('retourne [] pour un body valide', () => {
    expect(validateEventInput(base)).toEqual([])
  })

  it('erreur si titre manquant ou trop court', () => {
    expect(validateEventInput({ ...base, titre: '' }).some((m) => /titre/i.test(m))).toBe(true)
    expect(validateEventInput({ ...base, titre: 'AB' }).some((m) => /titre/i.test(m))).toBe(true)
  })

  it('erreur si date manquante ou invalide', () => {
    expect(validateEventInput({ ...base, date: '' }).some((m) => /date/i.test(m))).toBe(true)
    expect(validateEventInput({ ...base, date: 'abc' }).some((m) => /date/i.test(m))).toBe(true)
  })

  it('erreur si heure invalide', () => {
    expect(validateEventInput({ ...base, heure: '25:00' }).some((m) => /heure/i.test(m))).toBe(true)
    expect(validateEventInput({ ...base, heure: '15h30' }).some((m) => /heure/i.test(m))).toBe(true)
  })

  it('accepte les heures HH:MM valides', () => {
    expect(validateEventInput({ ...base, heure: '00:00' })).toEqual([])
    expect(validateEventInput({ ...base, heure: '23:59' })).toEqual([])
    expect(validateEventInput({ ...base, heure: '8:05' })).toEqual([])
  })

  it('erreur si lieu manquant', () => {
    expect(validateEventInput({ ...base, lieu: '' }).some((m) => /lieu/i.test(m))).toBe(true)
  })

  it('erreur si type manquant ou invalide', () => {
    expect(validateEventInput({ ...base, type: '' }).some((m) => /type/i.test(m))).toBe(true)
    expect(validateEventInput({ ...base, type: 'AMICAL' }).some((m) => /type/i.test(m))).toBe(true)
  })

  it('erreur si categorieId invalide', () => {
    expect(validateEventInput({ ...base, categorieId: 0 }).some((m) => /catégorie/i.test(m))).toBe(true)
    expect(validateEventInput({ ...base, categorieId: 'x' }).some((m) => /catégorie/i.test(m))).toBe(true)
  })

  it('erreur si equipeA non vide invalide', () => {
    const e = validateEventInput({ ...base, equipeA: 12 })
    expect(e.some((m) => /équipe A/i.test(m))).toBe(true)
  })

  it('erreur si equipeB non vide invalide', () => {
    const e = validateEventInput({ ...base, equipeB: 12 })
    expect(e.some((m) => /équipe B/i.test(m))).toBe(true)
  })

  it('erreur si typeMatch invalide', () => {
    const e = validateEventInput({ ...base, typeMatch: 'AUTRE' })
    expect(e.some((m) => /AMICAL ou CHAMPIONNAT/i.test(m))).toBe(true)
  })

  it('accepte typeMatch AMICAL et CHAMPIONNAT', () => {
    expect(validateEventInput({ ...base, typeMatch: 'AMICAL' })).toEqual([])
    expect(validateEventInput({ ...base, typeMatch: 'CHAMPIONNAT' })).toEqual([])
  })

  it('erreur si scoreA négatif ou non entier', () => {
    const e = validateEventInput({ ...base, scoreA: -1 })
    expect(e.some((m) => /score A/i.test(m))).toBe(true)
    const e2 = validateEventInput({ ...base, scoreA: 1.5 })
    expect(e2.some((m) => /score A/i.test(m))).toBe(true)
  })

  it('erreur si scoreB négatif ou non entier', () => {
    const e = validateEventInput({ ...base, scoreB: -1 })
    expect(e.some((m) => /score B/i.test(m))).toBe(true)
    const e2 = validateEventInput({ ...base, scoreB: 1.5 })
    expect(e2.some((m) => /score B/i.test(m))).toBe(true)
  })

  it('erreur si duree négative', () => {
    const e = validateEventInput({ ...base, duree: 0 })
    expect(e.some((m) => /durée/i.test(m))).toBe(true)
  })

  it('erreur si objectif non vide invalide', () => {
    const e = validateEventInput({ ...base, objectif: 42 })
    expect(e.some((m) => /objectif/i.test(m))).toBe(true)
  })
})
