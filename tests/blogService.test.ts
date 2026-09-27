import { describe, it, expect } from 'vitest'
import { sanitize } from 'isomorphic-dompurify'

/** Sanitise le HTML (réplique la fonction assainirContenu du blogService). */
function assainirContenu(contenu: string): string {
  return sanitize(String(contenu), {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'pre', 'code', 'span', 'div',
      'figure', 'figcaption', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel', 'width', 'height'],
  })
}

/** Extrait lisible (réplique extraireExtrait du blogService). */
function extraireExtrait(contenu: string): string {
  const texte = String(contenu)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return texte.length > 150 ? `${texte.slice(0, 150)}…` : texte
}

describe('blogService — assainirContenu (XSS)', () => {
  it('conserve les balises sûres (p, strong, em)', () => {
    const html = '<p>Bonjour <strong>monde</strong></p>'
    expect(assainirContenu(html)).toBe('<p>Bonjour <strong>monde</strong></p>')
  })

  it('supprime les balises script', () => {
    const html = '<p>Texte</p><script>alert("XSS")</script>'
    const result = assainirContenu(html)
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('alert')
    expect(result).toContain('Texte')
  })

  it('supprime les handlers onerror', () => {
    const html = '<img src="x" onerror="alert(1)">'
    const result = assainirContenu(html)
    expect(result).not.toContain('onerror')
    expect(result).toContain('<img src="x">')
  })

  it('supprime les handlers onclick', () => {
    const html = '<a href="#" onclick="alert(1)">click</a>'
    const result = assainirContenu(html)
    expect(result).not.toContain('onclick')
  })

  it('supprime les href javascript:', () => {
    const html = '<a href="javascript:alert(1)">click</a>'
    const result = assainirContenu(html)
    expect(result).not.toContain('javascript:')
  })

  it('conserve les attributs sûrs (href, alt, src)', () => {
    const html = '<a href="https://example.com" title="lien">texte</a><img src="img.jpg" alt="desc">'
    const result = assainirContenu(html)
    expect(result).toContain('href="https://example.com"')
    expect(result).toContain('alt="desc"')
  })

  it('conserve les titres h1-h6', () => {
    const html = '<h1>Titre</h1><h2>Sous-titre</h2>'
    expect(assainirContenu(html)).toBe('<h1>Titre</h1><h2>Sous-titre</h2>')
  })

  it('conserve les listes ul/ol/li', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>'
    expect(assainirContenu(html)).toBe('<ul><li>Item 1</li><li>Item 2</li></ul>')
  })

  it('supprime les iframes', () => {
    const html = '<iframe src="evil.com"></iframe><p>ok</p>'
    const result = assainirContenu(html)
    expect(result).not.toContain('iframe')
    expect(result).toContain('ok')
  })
})

describe('blogService — extraireExtrait', () => {
  it('retourne le texte sans HTML', () => {
    expect(extraireExtrait('<p>Bonjour</p>')).toBe('Bonjour')
  })

  it('tronque à 150 caractères avec …', () => {
    const long = 'A'.repeat(200)
    const result = extraireExtrait(long)
    expect(result.length).toBe(151) // 150 + …
    expect(result.endsWith('…')).toBe(true)
  })

  it('ne tronque pas si ≤ 150 caractères', () => {
    const court = 'A'.repeat(100)
    expect(extraireExtrait(court)).toBe(court)
  })

  it('supprime les balises HTML multiples', () => {
    expect(extraireExtrait('<p>Bonjour</p><p>le monde</p>')).toBe('Bonjour le monde')
  })

  it('gère le contenu vide', () => {
    expect(extraireExtrait('')).toBe('')
  })
})
