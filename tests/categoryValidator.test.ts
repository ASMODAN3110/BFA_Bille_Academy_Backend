import { describe, it, expect } from 'vitest'
import { validateCategoryInput } from '../src/utils/categoryValidator'

describe('validateCategoryInput', () => {
  it('retourne un tableau vide pour un body valide', () => {
    const body = { nom: 'U13', ageMin: 11, ageMax: 13 }
    expect(validateCategoryInput(body)).toEqual([])
  })

  it('retourne une erreur quand le nom est manquant', () => {
    const body = { ageMin: 11, ageMax: 13 }
    const erreurs = validateCategoryInput(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/nom/i)
  })

  it('retourne une erreur quand le nom est trop court (1 caractère)', () => {
    const body = { nom: 'A', ageMin: 11, ageMax: 13 }
    const erreurs = validateCategoryInput(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/nom/i)
  })

  it('retourne une erreur quand ageMin est manquant', () => {
    const body = { nom: 'U13', ageMax: 13 }
    const erreurs = validateCategoryInput(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/âge minimum/i)
  })

  it('retourne une erreur quand ageMin n\'est pas un entier', () => {
    const body = { nom: 'U13', ageMin: 'abc', ageMax: 13 }
    const erreurs = validateCategoryInput(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/âge minimum/i)
  })

  it('retourne une erreur quand ageMin < 9', () => {
    const body = { nom: 'U13', ageMin: 8, ageMax: 13 }
    const erreurs = validateCategoryInput(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/âge minimum/i)
  })

  it('retourne une erreur quand ageMin > 17', () => {
    const body = { nom: 'U13', ageMin: 18, ageMax: 18 }
    const erreurs = validateCategoryInput(body)
    expect(erreurs.some((e) => /âge minimum/i.test(e))).toBe(true)
  })

  it('retourne une erreur quand ageMax est manquant', () => {
    const body = { nom: 'U13', ageMin: 11 }
    const erreurs = validateCategoryInput(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/âge maximum/i)
  })

  it('retourne une erreur quand ageMax n\'est pas un entier', () => {
    const body = { nom: 'U13', ageMin: 11, ageMax: 'xyz' }
    const erreurs = validateCategoryInput(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/âge maximum/i)
  })

  it('retourne une erreur quand ageMax < 9', () => {
    const body = { nom: 'U13', ageMin: 7, ageMax: 7 }
    const erreurs = validateCategoryInput(body)
    expect(erreurs.some((e) => /âge maximum/i.test(e))).toBe(true)
  })

  it('retourne une erreur quand ageMax > 17', () => {
    const body = { nom: 'U13', ageMin: 11, ageMax: 20 }
    const erreurs = validateCategoryInput(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/âge maximum/i)
  })

  it('retourne une erreur quand ageMin > ageMax', () => {
    const body = { nom: 'U13', ageMin: 15, ageMax: 11 }
    const erreurs = validateCategoryInput(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/supérieur/i)
  })

  it('accepte ageMin = ageMax (valide)', () => {
    const body = { nom: 'U13', ageMin: 13, ageMax: 13 }
    expect(validateCategoryInput(body)).toEqual([])
  })

  it('retourne plusieurs erreurs quand tous les champs manquent', () => {
    const body = {}
    const erreurs = validateCategoryInput(body)
    expect(erreurs.length).toBeGreaterThanOrEqual(3)
    expect(erreurs.some((e) => /nom/i.test(e))).toBe(true)
    expect(erreurs.some((e) => /âge minimum/i.test(e))).toBe(true)
    expect(erreurs.some((e) => /âge maximum/i.test(e))).toBe(true)
  })
})
