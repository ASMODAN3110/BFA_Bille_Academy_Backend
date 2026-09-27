import { describe, it, expect } from 'vitest'
import { validatePlayerInput } from '../src/utils/playerValidator'

describe('validatePlayerInput', () => {
  it('retourne un tableau vide pour un body valide', () => {
    const body = {
      nom: 'Doe',
      prenom: 'John',
      poste: 'Attaquant',
      dateNaissance: '2010-05-15',
      categorieId: 1,
    }
    expect(validatePlayerInput(body)).toEqual([])
  })

  it('retourne une erreur quand le nom est manquant', () => {
    const body = {
      prenom: 'John',
      poste: 'Attaquant',
      dateNaissance: '2010-05-15',
      categorieId: 1,
    }
    const erreurs = validatePlayerInput(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/nom/i)
  })

  it('retourne une erreur quand le nom est trop court', () => {
    const body = {
      nom: 'A',
      prenom: 'John',
      poste: 'Attaquant',
      dateNaissance: '2010-05-15',
      categorieId: 1,
    }
    const erreurs = validatePlayerInput(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/nom/i)
  })

  it('retourne une erreur quand le prénom est manquant', () => {
    const body = {
      nom: 'Doe',
      poste: 'Attaquant',
      dateNaissance: '2010-05-15',
      categorieId: 1,
    }
    const erreurs = validatePlayerInput(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/prénom/i)
  })

  it('retourne une erreur quand le prénom est trop court', () => {
    const body = {
      nom: 'Doe',
      prenom: 'J',
      poste: 'Attaquant',
      dateNaissance: '2010-05-15',
      categorieId: 1,
    }
    const erreurs = validatePlayerInput(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/prénom/i)
  })

  it('retourne une erreur quand le poste est manquant', () => {
    const body = {
      nom: 'Doe',
      prenom: 'John',
      dateNaissance: '2010-05-15',
      categorieId: 1,
    }
    const erreurs = validatePlayerInput(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/poste/i)
  })

  it('retourne une erreur quand dateNaissance est manquant', () => {
    const body = {
      nom: 'Doe',
      prenom: 'John',
      poste: 'Attaquant',
      categorieId: 1,
    }
    const erreurs = validatePlayerInput(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/date de naissance/i)
  })

  it('retourne une erreur quand dateNaissance est invalide', () => {
    const body = {
      nom: 'Doe',
      prenom: 'John',
      poste: 'Attaquant',
      dateNaissance: 'pas-une-date',
      categorieId: 1,
    }
    const erreurs = validatePlayerInput(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/date de naissance/i)
  })

  it('retourne une erreur quand dateNaissance est dans le futur', () => {
    const body = {
      nom: 'Doe',
      prenom: 'John',
      poste: 'Attaquant',
      dateNaissance: '2099-05-15',
      categorieId: 1,
    }
    const erreurs = validatePlayerInput(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/passé/i)
  })

  it('retourne une erreur quand categorieId est manquant', () => {
    const body = {
      nom: 'Doe',
      prenom: 'John',
      poste: 'Attaquant',
      dateNaissance: '2010-05-15',
    }
    const erreurs = validatePlayerInput(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/catégorie/i)
  })

  it('retourne une erreur quand categorieId = 0', () => {
    const body = {
      nom: 'Doe',
      prenom: 'John',
      poste: 'Attaquant',
      dateNaissance: '2010-05-15',
      categorieId: 0,
    }
    const erreurs = validatePlayerInput(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/catégorie/i)
  })

  it('retourne une erreur quand categorieId est négatif', () => {
    const body = {
      nom: 'Doe',
      prenom: 'John',
      poste: 'Attaquant',
      dateNaissance: '2010-05-15',
      categorieId: -5,
    }
    const erreurs = validatePlayerInput(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/catégorie/i)
  })

  it('retourne une erreur quand categorieId n\'est pas un entier', () => {
    const body = {
      nom: 'Doe',
      prenom: 'John',
      poste: 'Attaquant',
      dateNaissance: '2010-05-15',
      categorieId: 'abc',
    }
    const erreurs = validatePlayerInput(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/catégorie/i)
  })

  it('accepte une photo valide (URL)', () => {
    const body = {
      nom: 'Doe',
      prenom: 'John',
      poste: 'Attaquant',
      dateNaissance: '2010-05-15',
      categorieId: 1,
      photo: 'https://example.com/photo.jpg',
    }
    expect(validatePlayerInput(body)).toEqual([])
  })

  it('accepte photo = null', () => {
    const body = {
      nom: 'Doe',
      prenom: 'John',
      poste: 'Attaquant',
      dateNaissance: '2010-05-15',
      categorieId: 1,
      photo: null,
    }
    expect(validatePlayerInput(body)).toEqual([])
  })

  it('retourne une erreur quand photo est une chaîne vide', () => {
    const body = {
      nom: 'Doe',
      prenom: 'John',
      poste: 'Attaquant',
      dateNaissance: '2010-05-15',
      categorieId: 1,
      photo: '',
    }
    const erreurs = validatePlayerInput(body)
    expect(erreurs.length).toBe(1)
    expect(erreurs[0]).toMatch(/photo/i)
  })

  it('retourne plusieurs erreurs quand tous les champs manquent', () => {
    const body = {}
    const erreurs = validatePlayerInput(body)
    expect(erreurs.length).toBeGreaterThanOrEqual(5)
    expect(erreurs.some((e) => /nom/i.test(e))).toBe(true)
    expect(erreurs.some((e) => /prénom/i.test(e))).toBe(true)
    expect(erreurs.some((e) => /poste/i.test(e))).toBe(true)
    expect(erreurs.some((e) => /date de naissance/i.test(e))).toBe(true)
    expect(erreurs.some((e) => /catégorie/i.test(e))).toBe(true)
  })
})
