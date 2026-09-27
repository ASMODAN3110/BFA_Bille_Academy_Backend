import { describe, it, expect } from 'vitest'
import {
  validateBlogCreate,
  validateBlogUpdate,
  validateBlogPatch,
  CATEGORIES_ARTICLE,
} from '../src/utils/blogValidator'

describe('CATEGORIES_ARTICLE', () => {
  it('contient exactement les catégories attendues', () => {
    expect(CATEGORIES_ARTICLE).toEqual([
      'MATCHS',
      'EVENEMENTS',
      'PORTRAITS',
      'COMMUNIQUES',
    ])
  })
})

describe('validateBlogCreate', () => {
  const bodyValide = {
    titre: 'Victoire en coupe',
    categorie: 'MATCHS',
    auteur: 'Jean Dupont',
    contenu: 'Ceci est un contenu suffisamment long pour valider.',
  }

  it('retourne un tableau vide pour un body valide', () => {
    expect(validateBlogCreate(bodyValide)).toEqual([])
  })

  it('retourne une erreur quand le titre est manquant', () => {
    const body = { ...bodyValide, titre: undefined }
    const erreurs = validateBlogCreate(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/titre/i)
  })

  it('retourne une erreur quand le titre est trop court (2 caractères)', () => {
    const body = { ...bodyValide, titre: 'ab' }
    const erreurs = validateBlogCreate(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/titre/i)
  })

  it('retourne une erreur quand la catégorie est manquante', () => {
    const body = { ...bodyValide, categorie: undefined }
    const erreurs = validateBlogCreate(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/catégorie/i)
  })

  it('retourne une erreur quand la catégorie est invalide', () => {
    const body = { ...bodyValide, categorie: 'INCONNU' }
    const erreurs = validateBlogCreate(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/catégorie/i)
  })

  it('retourne une erreur quand l\'auteur est manquant', () => {
    const body = { ...bodyValide, auteur: undefined }
    const erreurs = validateBlogCreate(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/auteur/i)
  })

  it('retourne une erreur quand l\'auteur est trop court', () => {
    const body = { ...bodyValide, auteur: 'a' }
    const erreurs = validateBlogCreate(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/auteur/i)
  })

  it('retourne une erreur quand le contenu est manquant', () => {
    const body = { ...bodyValide, contenu: undefined }
    const erreurs = validateBlogCreate(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/contenu/i)
  })

  it('retourne une erreur quand le contenu est trop court (texte sans HTML < 20)', () => {
    const body = { ...bodyValide, contenu: 'court' }
    const erreurs = validateBlogCreate(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/contenu/i)
  })

  it('retourne une erreur quand le contenu contient du HTML mais le texte < 20', () => {
    const body = { ...bodyValide, contenu: '<p>court</p>' }
    const erreurs = validateBlogCreate(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/contenu/i)
  })

  it('accepte un contenu avec HTML et texte ≥ 20 caractères', () => {
    const body = {
      ...bodyValide,
      contenu: '<p>Ceci est un contenu suffisamment long.</p>',
    }
    expect(validateBlogCreate(body)).toEqual([])
  })

  it('retourne une erreur quand l\'image est vide', () => {
    const body = { ...bodyValide, image: '' }
    const erreurs = validateBlogCreate(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/image/i)
  })

  it('retourne une erreur quand estPublie n\'est pas un booléen', () => {
    const body = { ...bodyValide, estPublie: 'oui' }
    const erreurs = validateBlogCreate(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/estPublie/i)
  })

  it('retourne une erreur quand datePublication est invalide', () => {
    const body = { ...bodyValide, datePublication: 'pas-une-date' }
    const erreurs = validateBlogCreate(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/datePublication/i)
  })
})

describe('validateBlogUpdate', () => {
  it('applique les mêmes règles que validateBlogCreate (body valide)', () => {
    const body = {
      titre: 'Victoire en coupe',
      categorie: 'MATCHS',
      auteur: 'Jean Dupont',
      contenu: 'Ceci est un contenu suffisamment long pour valider.',
    }
    expect(validateBlogUpdate(body)).toEqual([])
  })

  it('applique les mêmes règles que validateBlogCreate (titre trop court)', () => {
    const body = {
      titre: 'ab',
      categorie: 'MATCHS',
      auteur: 'Jean Dupont',
      contenu: 'Ceci est un contenu suffisamment long pour valider.',
    }
    const erreurs = validateBlogUpdate(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/titre/i)
  })
})

describe('validateBlogPatch', () => {
  it('retourne un tableau vide pour un body vide', () => {
    expect(validateBlogPatch({})).toEqual([])
  })

  it('retourne un tableau vide quand seul le titre est fourni (valide)', () => {
    expect(validateBlogPatch({ titre: 'Un titre valide' })).toEqual([])
  })

  it('retourne une erreur quand seul le titre est fourni (invalide)', () => {
    const erreurs = validateBlogPatch({ titre: 'ab' })
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/titre/i)
  })

  it('retourne une erreur quand seule la catégorie est fournie (invalide)', () => {
    const erreurs = validateBlogPatch({ categorie: 'INCONNU' })
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/catégorie/i)
  })
})
