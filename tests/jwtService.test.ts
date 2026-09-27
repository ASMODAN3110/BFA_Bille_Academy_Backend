import { describe, it, expect } from 'vitest'
import { signToken, verifyToken, type AuthTokenPayload } from '../src/services/jwtService'

// Le secret est requis par jwtService — on le définit avant les tests.
process.env.JWT_SECRET = 'test-secret-key-32-chars-long!!'

const payload: AuthTokenPayload = { id: 1, email: 'admin@test.com', role: 'SUPER_ADMIN' }

describe('jwtService — signToken / verifyToken', () => {
  it('signe un token et le vérifie', () => {
    const token = signToken(payload)
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3) // header.payload.signature
  })

  it('le payload vérifié contient id, email, role', () => {
    const token = signToken(payload)
    const decoded = verifyToken(token)
    expect(decoded.id).toBe(payload.id)
    expect(decoded.email).toBe(payload.email)
    expect(decoded.role).toBe(payload.role)
  })

  it('rejette un token invalide', () => {
    expect(() => verifyToken('invalid.token.here')).toThrow()
  })

  it('rejette un token signé avec un autre secret', () => {
    const token = signToken(payload)
    // On change le secret et on vérifie → doit échouer
    const oldSecret = process.env.JWT_SECRET
    process.env.JWT_SECRET = 'autre-secret'
    expect(() => verifyToken(token)).toThrow()
    process.env.JWT_SECRET = oldSecret
  })

  it('le token contient une expiration', () => {
    const token = signToken(payload)
    const decoded = verifyToken(token)
    expect(decoded).toHaveProperty('exp')
  })
})
