import { describe, it, expect } from 'vitest'
import {
  verifierAgeMinimum,
  verifierAgeEtCategorie,
  AGE_MINIMUM,
  AGE_MAXIMUM,
  type CategorieAge,
} from '../src/services/playerService'

describe('playerService — verifierAgeMinimum', () => {
  it('accepte un âge dans la tranche [9, 17]', () => {
    const naissance = new Date('2015-01-01') // ~11 ans
    const verdict = verifierAgeMinimum(naissance)
    expect(verdict.ok).toBe(true)
    expect(verdict.message).toBeUndefined()
  })

  it('accepte exactement 9 ans (limite inférieure)', () => {
    const naissance = new Date('2017-09-27') // 9 ans pile
    const verdict = verifierAgeMinimum(naissance)
    expect(verdict.ok).toBe(true)
  })

  it('accepte exactement 17 ans (limite supérieure)', () => {
    const naissance = new Date('2009-09-27') // 17 ans pile
    const verdict = verifierAgeMinimum(naissance)
    expect(verdict.ok).toBe(true)
  })

  it('rejette un âge < 9 ans', () => {
    const naissance = new Date('2020-01-01') // ~6 ans
    const verdict = verifierAgeMinimum(naissance)
    expect(verdict.ok).toBe(false)
    expect(verdict.message).toContain('9 ans')
  })

  it('rejette un âge > 17 ans', () => {
    const naissance = new Date('2005-01-01') // ~21 ans
    const verdict = verifierAgeMinimum(naissance)
    expect(verdict.ok).toBe(false)
    expect(verdict.message).toContain('17 ans')
  })

  it('exporte les constantes AGE_MINIMUM et AGE_MAXIMUM', () => {
    expect(AGE_MINIMUM).toBe(9)
    expect(AGE_MAXIMUM).toBe(17)
  })
})

describe('playerService — verifierAgeEtCategorie', () => {
  const categorie: CategorieAge = { ageMin: 11, ageMax: 13 }

  it('accepte un âge dans la tranche de la catégorie', () => {
    const naissance = new Date('2013-01-01') // ~13 ans
    const verdict = verifierAgeEtCategorie(naissance, categorie)
    expect(verdict.ok).toBe(true)
  })

  it('accepte l\'âge minimum de la catégorie', () => {
    const naissance = new Date('2015-01-01') // ~11 ans
    const verdict = verifierAgeEtCategorie(naissance, categorie)
    expect(verdict.ok).toBe(true)
  })

  it('accepte l\'âge maximum de la catégorie', () => {
    const naissance = new Date('2013-01-01') // ~13 ans
    const verdict = verifierAgeEtCategorie(naissance, categorie)
    expect(verdict.ok).toBe(true)
  })

  it('rejette un âge inférieur à ageMin', () => {
    const naissance = new Date('2018-01-01') // ~8 ans
    const verdict = verifierAgeEtCategorie(naissance, categorie)
    expect(verdict.ok).toBe(false)
    expect(verdict.message).toContain('ne correspond pas')
  })

  it('rejette un âge supérieur à ageMax', () => {
    const naissance = new Date('2008-01-01') // ~18 ans
    const verdict = verifierAgeEtCategorie(naissance, categorie)
    expect(verdict.ok).toBe(false)
    expect(verdict.message).toContain('ne correspond pas')
  })
})
