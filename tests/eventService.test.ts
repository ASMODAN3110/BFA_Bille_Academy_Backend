import { describe, it, expect } from 'vitest'
import {
  verifierChampsParType,
  calculerFenetreMois,
} from '../src/services/eventService'

describe('eventService — verifierChampsParType', () => {
  it('MATCH avec les deux équipes → ok', () => {
    const verdict = verifierChampsParType('MATCH', { equipeA: 'FC A', equipeB: 'FC B' })
    expect(verdict.ok).toBe(true)
  })

  it('MATCH sans équipeA → erreur', () => {
    const verdict = verifierChampsParType('MATCH', { equipeB: 'FC B' })
    expect(verdict.ok).toBe(false)
    expect(verdict.message).toContain('équipe A')
  })

  it('MATCH sans équipeB → erreur', () => {
    const verdict = verifierChampsParType('MATCH', { equipeA: 'FC A' })
    expect(verdict.ok).toBe(false)
    expect(verdict.message).toContain('équipe B')
  })

  it('MATCH sans les deux équipes → erreur', () => {
    const verdict = verifierChampsParType('MATCH', {})
    expect(verdict.ok).toBe(false)
  })

  it('MATCH avec équipeA vide → erreur', () => {
    const verdict = verifierChampsParType('MATCH', { equipeA: '', equipeB: 'FC B' })
    expect(verdict.ok).toBe(false)
  })

  it('ENTRAINEMENT → toujours ok', () => {
    expect(verifierChampsParType('ENTRAINEMENT', {}).ok).toBe(true)
    expect(verifierChampsParType('ENTRAINEMENT', { objectif: 'Technique', duree: 90 }).ok).toBe(true)
  })
})

describe('eventService — calculerFenetreMois', () => {
  it('retourne le 1er du mois et le 1er du mois suivant', () => {
    const f = calculerFenetreMois('2026-09')
    expect(f.gte).toEqual(new Date(Date.UTC(2026, 8, 1)))  // septembre = mois 8 (0-indexé)
    expect(f.lt).toEqual(new Date(Date.UTC(2026, 9, 1)))   // octobre = mois 9
  })

  it('gère décembre → janvier de l\'année suivante', () => {
    const f = calculerFenetreMois('2026-12')
    expect(f.gte).toEqual(new Date(Date.UTC(2026, 11, 1)))
    expect(f.lt).toEqual(new Date(Date.UTC(2027, 0, 1)))
  })

  it('gère janvier', () => {
    const f = calculerFenetreMois('2026-01')
    expect(f.gte).toEqual(new Date(Date.UTC(2026, 0, 1)))
    expect(f.lt).toEqual(new Date(Date.UTC(2026, 1, 1)))
  })

  it('la borne supérieure est exclusive (un événement le 31 est inclus)', () => {
    const f = calculerFenetreMois('2026-09')
    const jour31 = new Date(Date.UTC(2026, 8, 30))
    expect(jour31 >= f.gte && jour31 < f.lt).toBe(true)
  })
})
