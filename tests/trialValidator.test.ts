import { describe, it, expect } from 'vitest'
import { validateTrialInput, validateRefusInput } from '../src/utils/trialValidator'

const base = {
  nomJoueur: 'Dupont', prenomJoueur: 'Jean', age: 12,
  telephone: '+237690000000', email: 'test@example.com',
  dateEssai: '2027-01-15',
}

describe('validateTrialInput', () => {
  it('retourne [] pour un body valide', () => {
    expect(validateTrialInput(base)).toEqual([])
  })

  it('erreur si nomJoueur manquant', () => {
    expect(validateTrialInput({ ...base, nomJoueur: '' }).some((m) => /nom/i.test(m))).toBe(true)
  })

  it('erreur si prenomJoueur manquant', () => {
    expect(validateTrialInput({ ...base, prenomJoueur: '' }).some((m) => /prénom/i.test(m))).toBe(true)
  })

  it('erreur si âge hors bornes', () => {
    expect(validateTrialInput({ ...base, age: 8 }).some((m) => /âge/i.test(m))).toBe(true)
    expect(validateTrialInput({ ...base, age: 18 }).some((m) => /âge/i.test(m))).toBe(true)
    expect(validateTrialInput({ ...base, age: 'abc' }).some((m) => /âge/i.test(m))).toBe(true)
  })

  it('accepte les bornes 9 et 17', () => {
    expect(validateTrialInput({ ...base, age: 9 })).toEqual([])
    expect(validateTrialInput({ ...base, age: 17 })).toEqual([])
  })

  it('erreur si telephone manquant', () => {
    expect(validateTrialInput({ ...base, telephone: '' }).some((m) => /téléphone/i.test(m))).toBe(true)
  })

  it('erreur si email invalide', () => {
    expect(validateTrialInput({ ...base, email: 'pas-email' }).some((m) => /email/i.test(m))).toBe(true)
    expect(validateTrialInput({ ...base, email: '' }).some((m) => /email/i.test(m))).toBe(true)
  })

  it('erreur si dateEssai dans le passé', () => {
    expect(validateTrialInput({ ...base, dateEssai: '2020-01-01' }).some((m) => /futur/i.test(m))).toBe(true)
  })

  it('erreur si dateEssai invalide', () => {
    expect(validateTrialInput({ ...base, dateEssai: 'abc' }).some((m) => /date/i.test(m))).toBe(true)
  })

  it('erreur si message non vide invalide', () => {
    const e = validateTrialInput({ ...base, message: 123 })
    expect(e.some((m) => /message/i.test(m))).toBe(true)
  })

  it('accepte message optionnel', () => {
    expect(validateTrialInput({ ...base, message: 'Bonjour' })).toEqual([])
  })
})

describe('validateRefusInput', () => {
  it('retourne [] si motif fourni', () => {
    expect(validateRefusInput({ motifRefus: 'Trop jeune' })).toEqual([])
  })

  it('erreur si motif manquant', () => {
    expect(validateRefusInput({}).some((m) => /motif/i.test(m))).toBe(true)
    expect(validateRefusInput({ motifRefus: '' }).some((m) => /motif/i.test(m))).toBe(true)
  })
})
