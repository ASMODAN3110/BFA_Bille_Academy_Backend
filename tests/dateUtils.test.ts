import { describe, it, expect } from 'vitest'
import { calculateAge } from '../src/utils/dateUtils'

describe('calculateAge', () => {
  it('retourne l\'âge correct quand l\'anniversaire est passé cette année', () => {
    const naissance = new Date('2010-05-15')
    const aujourdhui = new Date('2026-09-27')
    expect(calculateAge(naissance, aujourdhui)).toBe(16)
  })

  it('retourne l\'âge moins 1 quand l\'anniversaire n\'est pas encore passé cette année', () => {
    const naissance = new Date('2010-12-15')
    const aujourdhui = new Date('2026-09-27')
    expect(calculateAge(naissance, aujourdhui)).toBe(15)
  })

  it('retourne l\'âge exact le jour de l\'anniversaire', () => {
    const naissance = new Date('2010-09-27')
    const aujourdhui = new Date('2026-09-27')
    expect(calculateAge(naissance, aujourdhui)).toBe(16)
  })

  it('peut retourner un âge négatif avec une date de naissance dans le futur', () => {
    const naissance = new Date('2030-01-01')
    const aujourdhui = new Date('2026-09-27')
    expect(calculateAge(naissance, aujourdhui)).toBe(-4)
  })

  it('retourne l\'âge moins 1 avec le même mois mais le jour pas encore passé', () => {
    const naissance = new Date('2010-09-30')
    const aujourdhui = new Date('2026-09-27')
    expect(calculateAge(naissance, aujourdhui)).toBe(15)
  })
})
