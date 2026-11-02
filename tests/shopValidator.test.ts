import { describe, it, expect } from 'vitest'
import { validateProductCreate, validateQuoteCreate, TAILLES, CATEGORIES_PRODUIT } from '../src/utils/shopValidator'

const baseProduit = {
  nom: 'Maillot BFA', description: 'Maillot officiel de l\'académie',
  prix: 5000, tailles: ['S', 'M'], categorie: 'Vêtements',
}

describe('validateProductCreate', () => {
  it('retourne [] pour un body valide', () => {
    expect(validateProductCreate(baseProduit)).toEqual([])
  })

  it('accepte toutes les catégories', () => {
    for (const c of CATEGORIES_PRODUIT) {
      expect(validateProductCreate({ ...baseProduit, categorie: c })).toEqual([])
    }
  })

  it('accepte toutes les tailles', () => {
    for (const t of TAILLES) {
      expect(validateProductCreate({ ...baseProduit, tailles: [t] })).toEqual([])
    }
  })

  it('erreur si nom manquant ou trop court', () => {
    expect(validateProductCreate({ ...baseProduit, nom: '' }).some((m) => /nom/i.test(m))).toBe(true)
    expect(validateProductCreate({ ...baseProduit, nom: 'AB' }).some((m) => /nom/i.test(m))).toBe(true)
  })

  it('erreur si description manquante ou courte', () => {
    expect(validateProductCreate({ ...baseProduit, description: '' }).some((m) => /description/i.test(m))).toBe(true)
    expect(validateProductCreate({ ...baseProduit, description: 'Court' }).some((m) => /description/i.test(m))).toBe(true)
  })

  it('erreur si prix invalide', () => {
    expect(validateProductCreate({ ...baseProduit, prix: 0 }).some((m) => /prix/i.test(m))).toBe(true)
    expect(validateProductCreate({ ...baseProduit, prix: -1 }).some((m) => /prix/i.test(m))).toBe(true)
    expect(validateProductCreate({ ...baseProduit, prix: 'abc' }).some((m) => /prix/i.test(m))).toBe(true)
    expect(validateProductCreate({ ...baseProduit, prix: '' }).some((m) => /prix/i.test(m))).toBe(true)
  })

  it('erreur si aucune taille', () => {
    expect(validateProductCreate({ ...baseProduit, tailles: [] }).some((m) => /taille/i.test(m))).toBe(true)
    expect(validateProductCreate({ ...baseProduit, tailles: null }).some((m) => /taille/i.test(m))).toBe(true)
  })

  it('erreur si taille invalide', () => {
    expect(validateProductCreate({ ...baseProduit, tailles: ['XXL'] }).some((m) => /taille/i.test(m))).toBe(true)
  })

  it('erreur si categorie invalide', () => {
    expect(validateProductCreate({ ...baseProduit, categorie: 'Autre' }).some((m) => /catégorie/i.test(m))).toBe(true)
    expect(validateProductCreate({ ...baseProduit, categorie: '' }).some((m) => /catégorie/i.test(m))).toBe(true)
  })

  it('erreur si stock négatif ou non entier', () => {
    expect(validateProductCreate({ ...baseProduit, stock: -1 }).some((m) => /stock/i.test(m))).toBe(true)
    expect(validateProductCreate({ ...baseProduit, stock: 1.5 }).some((m) => /stock/i.test(m))).toBe(true)
  })

  it('accepte stock optionnel', () => {
    expect(validateProductCreate({ ...baseProduit, stock: 0 })).toEqual([])
    expect(validateProductCreate({ ...baseProduit, stock: 100 })).toEqual([])
  })

  it('erreur si estNouveau non booléen', () => {
    expect(validateProductCreate({ ...baseProduit, estNouveau: 'oui' }).some((m) => /booléen/i.test(m))).toBe(true)
  })

  it('accepte estNouveau booléen', () => {
    expect(validateProductCreate({ ...baseProduit, estNouveau: true })).toEqual([])
    expect(validateProductCreate({ ...baseProduit, estNouveau: 'true' })).toEqual([])
  })
})

const baseDevis = {
  nomComplet: 'Jean Dupont', email: 'jean@test.com',
  telephone: '+237690000000', produitId: 1, quantite: 2,
}

describe('validateQuoteCreate', () => {
  it('retourne [] pour un body valide', () => {
    expect(validateQuoteCreate(baseDevis)).toEqual([])
  })

  it('erreur si nomComplet manquant ou court', () => {
    expect(validateQuoteCreate({ ...baseDevis, nomComplet: '' }).some((m) => /nom complet/i.test(m))).toBe(true)
    expect(validateQuoteCreate({ ...baseDevis, nomComplet: 'A' }).some((m) => /nom complet/i.test(m))).toBe(true)
  })

  it('erreur si email invalide', () => {
    expect(validateQuoteCreate({ ...baseDevis, email: 'pas-email' }).some((m) => /email/i.test(m))).toBe(true)
    expect(validateQuoteCreate({ ...baseDevis, email: '' }).some((m) => /email/i.test(m))).toBe(true)
  })

  it('erreur si telephone manquant ou trop court (@EF43)', () => {
    expect(validateQuoteCreate({ ...baseDevis, telephone: '' }).some((m) => /téléphone/i.test(m))).toBe(true)
    expect(validateQuoteCreate({ ...baseDevis, telephone: '123' }).some((m) => /téléphone/i.test(m))).toBe(true)
  })

  it('erreur si produitId invalide', () => {
    expect(validateQuoteCreate({ ...baseDevis, produitId: 0 }).some((m) => /produit/i.test(m))).toBe(true)
    expect(validateQuoteCreate({ ...baseDevis, produitId: 'x' }).some((m) => /produit/i.test(m))).toBe(true)
  })

  it('erreur si quantite invalide', () => {
    expect(validateQuoteCreate({ ...baseDevis, quantite: 0 }).some((m) => /quantité/i.test(m))).toBe(true)
    expect(validateQuoteCreate({ ...baseDevis, quantite: -1 }).some((m) => /quantité/i.test(m))).toBe(true)
    expect(validateQuoteCreate({ ...baseDevis, quantite: 'x' }).some((m) => /quantité/i.test(m))).toBe(true)
  })

  it('erreur si taille invalide', () => {
    expect(validateQuoteCreate({ ...baseDevis, taille: 'XXL' }).some((m) => /taille/i.test(m))).toBe(true)
  })

  it('accepte taille optionnelle valide', () => {
    expect(validateQuoteCreate({ ...baseDevis, taille: 'M' })).toEqual([])
  })

  it('erreur si message non chaîne', () => {
    expect(validateQuoteCreate({ ...baseDevis, message: 123 }).some((m) => /message/i.test(m))).toBe(true)
  })

  it('accepte message optionnel', () => {
    expect(validateQuoteCreate({ ...baseDevis, message: 'Urgent' })).toEqual([])
  })
})

describe('validateQuoteCreate — devis à plusieurs articles', () => {
  const base = { nomComplet: 'Jean Dupont', email: 'jean@test.com', telephone: '+237690000000' }

  it('accepte une liste de plusieurs lignes valides', () => {
    const lignes = [
      { produitId: 1, quantite: 14, taille: 'M' },
      { produitId: 2, quantite: 14, taille: 'L' },
      { produitId: 3, quantite: 3 },
    ]
    expect(validateQuoteCreate({ ...base, lignes })).toEqual([])
  })

  it('accepte une liste d\'une seule ligne', () => {
    expect(validateQuoteCreate({ ...base, lignes: [{ produitId: 1, quantite: 1 }] })).toEqual([])
  })

  it('refuse une liste vide', () => {
    expect(validateQuoteCreate({ ...base, lignes: [] }).some((m) => /au moins un article/i.test(m))).toBe(true)
  })

  it('refuse des lignes qui ne sont pas une liste', () => {
    expect(validateQuoteCreate({ ...base, lignes: 'x' }).some((m) => /liste/i.test(m))).toBe(true)
  })

  it('refuse plus de 20 articles', () => {
    const lignes = Array.from({ length: 21 }, (_, i) => ({ produitId: i + 1, quantite: 1 }))
    expect(validateQuoteCreate({ ...base, lignes }).some((m) => /plus de 20/i.test(m))).toBe(true)
  })

  it('indique le numéro de l\'article en erreur', () => {
    const erreurs = validateQuoteCreate({
      ...base,
      lignes: [{ produitId: 1, quantite: 1 }, { produitId: 2, quantite: 0 }, { produitId: 'x', quantite: 1, taille: 'XXL' }],
    })
    expect(erreurs.some((m) => /^Article 2 : .*quantité/i.test(m))).toBe(true)
    expect(erreurs.some((m) => /^Article 3 : .*produit/i.test(m))).toBe(true)
    expect(erreurs.some((m) => /^Article 3 : .*taille/i.test(m))).toBe(true)
    expect(erreurs.some((m) => /^Article 1/i.test(m))).toBe(false)
  })

  it('refuse une ligne qui n\'est pas un objet', () => {
    expect(validateQuoteCreate({ ...base, lignes: [null] }).some((m) => /article invalide/i.test(m))).toBe(true)
  })

  it('valide toujours les champs du client avec des lignes valides', () => {
    const erreurs = validateQuoteCreate({ ...base, email: 'nope', lignes: [{ produitId: 1, quantite: 1 }] })
    expect(erreurs.some((m) => /email/i.test(m))).toBe(true)
  })
})
