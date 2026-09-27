import { describe, it, expect } from 'vitest'
import { validateAlbumInput, THEMES_ALBUM } from '../src/utils/albumValidator'

describe('validateAlbumInput', () => {
  it('retourne [] pour un body valide', () => {
    expect(validateAlbumInput({ titre: 'Album 2025', theme: 'Matchs' })).toEqual([])
  })

  it('accepte tous les thèmes', () => {
    for (const theme of THEMES_ALBUM) {
      expect(validateAlbumInput({ titre: 'Album', theme })).toEqual([])
    }
  })

  it('retourne une erreur si titre manquant', () => {
    const e = validateAlbumInput({ theme: 'Matchs' })
    expect(e.some((m) => /titre/i.test(m))).toBe(true)
  })

  it('retourne une erreur si titre < 3 caractères', () => {
    const e = validateAlbumInput({ titre: 'AB', theme: 'Matchs' })
    expect(e.some((m) => /titre/i.test(m))).toBe(true)
  })

  it('retourne une erreur si theme invalide', () => {
    const e = validateAlbumInput({ titre: 'Album', theme: 'Autre' })
    expect(e.some((m) => /thème/i.test(m))).toBe(true)
  })

  it('accepte une description optionnelle', () => {
    expect(validateAlbumInput({ titre: 'Album', theme: 'Matchs', description: 'Belle album' })).toEqual([])
  })

  it('retourne une erreur si description n\'est pas une chaîne', () => {
    const e = validateAlbumInput({ titre: 'Album', theme: 'Matchs', description: 123 })
    expect(e.some((m) => /description/i.test(m))).toBe(true)
  })
})
