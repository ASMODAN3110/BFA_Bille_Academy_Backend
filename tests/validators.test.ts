import { describe, it, expect } from 'vitest'
import {
  isValidEmail,
  isValidPassword,
  isValidNom,
  isValidNewPassword,
  MIN_PASSWORD_LENGTH,
} from '../src/utils/validators'

describe('validators — isValidEmail', () => {
  it('accepte un email valide', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name+tag@domain.co')).toBe(true)
  })

  it('rejette un email invalide', () => {
    expect(isValidEmail('pas-email')).toBe(false)
    expect(isValidEmail('test@')).toBe(false)
    expect(isValidEmail('@test.com')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })

  it('rejette les non-chaînes', () => {
    expect(isValidEmail(123)).toBe(false)
    expect(isValidEmail(null)).toBe(false)
    expect(isValidEmail(undefined)).toBe(false)
  })
})

describe('validators — isValidPassword', () => {
  it('accepte un mot de passe non vide', () => {
    expect(isValidPassword('abc123')).toBe(true)
    expect(isValidPassword(' ')).toBe(false) // trim → vide
  })

  it('rejette un mot de passe vide', () => {
    expect(isValidPassword('')).toBe(false)
    expect(isValidPassword(null)).toBe(false)
    expect(isValidPassword(undefined)).toBe(false)
  })
})

describe('validators — isValidNom', () => {
  it('accepte un nom non vide', () => {
    expect(isValidNom('Dupont')).toBe(true)
  })

  it('rejette un nom vide', () => {
    expect(isValidNom('')).toBe(false)
    expect(isValidNom('   ')).toBe(false)
    expect(isValidNom(null)).toBe(false)
  })
})

describe('validators — isValidNewPassword', () => {
  it('accepte un mot de passe ≥ MIN_PASSWORD_LENGTH', () => {
    expect(isValidNewPassword('abcdef')).toBe(true)
    expect(isValidNewPassword('longpassword123')).toBe(true)
  })

  it('rejette un mot de passe < MIN_PASSWORD_LENGTH', () => {
    expect(isValidNewPassword('abcde')).toBe(false)
    expect(isValidNewPassword('')).toBe(false)
  })

  it('exporte MIN_PASSWORD_LENGTH = 6', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(6)
  })
})
