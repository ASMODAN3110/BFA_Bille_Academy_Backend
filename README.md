# BFA Bille Football Academy — Backend

API REST de la **BFA Bille Football Academy** (académie de football amateur au Cameroun) : backend TypeScript/ESM alimentant le site public et le back-office. Serveur Express 5 + Prisma 7 + PostgreSQL 16 + MinIO (S3), déployable derrière Traefik en HTTPS.

## Stack technique

- **Node.js 26** + **tsx** (TypeScript ESM, pas de build séparé)
- **Express 5.2** (framework HTTP)
- **Prisma 7.9** (générateur `prisma-client`, output `generated/prisma`)
- **`@prisma/adapter-pg`** (driver adapter node-postgres, TCP direct)
- **PostgreSQL 16** (base de données relationnelle)
- **MinIO** (stockage S3 des médias, `@aws-sdk/client-s3`)
- **JWT** (`jsonwebtoken`) + **bcryptjs** (authentification)
- **Multer** (upload multipart, memoryStorage, ≤ 10 Mo)
- **Resend** (envoi d'emails via API HTTPS, best-effort)
- **Helmet** + **CORS** + **Morgan** (sécurité et logs HTTP)

## Démarrage rapide

### Prérequis

- Node.js 26+
- PostgreSQL 16 accessible
- MinIO (optionnel en dev — l'API démarre même si MinIO est indisponible)

### Installation

```bash
npm install
cp .env.example .env        # puis éditer DATABASE_URL, JWT_SECRET, S3_*…
npm run db:generate         # génère le client Prisma
npm run db:migrate          # applique les migrations (dev)
npm run db:seed             # insère les données de démonstration
npm run dev                 # serveur de développement (tsx watch)
```

L'API démarre sur le port défini par `PORT` (défaut : 3000, 4000 dans `.env.example`).

### Scripts npm

| Script | Description |
| --- | --- |
| `npm run dev` | Serveur de développement avec rechargement (`tsx watch`) |
| `npm start` | Démarrage production (`tsx src/index.ts`) |
| `npm run db:generate` | Génère le client Prisma |
| `npm run db:migrate` | Crée/applique une migration (`prisma migrate dev`) |
| `npm run db:push` | Synchronise le schéma sans migration (`prisma db push`) |
| `npm run db:seed` | Insère les données de démonstration |
| `npm run db:seed-media` | Upload les médias S3 de démonstration |
| `npm run db:studio` | Ouvre Prisma Studio |
| `npm run minio:start` | Démarre MinIO via Docker Compose |
| `npm run minio:stop` | Arrête MinIO |
| `npm run minio:create-bucket` | Crée le bucket S3 + policy public-read |
| `npm run lint` | ESLint sur `src/` et `tests/` (flat config) |
| `npm test` | Tests unitaires Vitest avec couverture V8 (seuils 70%) |
| `npm run test:watch` | Vitest en mode watch |

## Architecture

```
src/
├── index.ts              ← Point d'entrée (fail-fast JWT, ensureBucket)
├── app.ts                ← Construction Express + middlewares + montage routes
├── config/
│   ├── database.ts       ← Singleton PrismaClient (adapter-pg)
│   └── s3.ts             ← Client S3/MinIO (forcePathStyle)
├── middlewares/
│   ├── auth.ts           ← authenticate (JWT Bearer → req.user)
│   └── uploadMiddleware.ts ← Multer (memoryStorage, filtres MIME/taille)
├── routes/               ← 23 fichiers (public + admin par module)
├── controllers/          ← 12 contrôleurs (traduit code métier → HTTP)
├── services/             ← 14 services (règles métier, ne lève jamais d'HTTP)
├── utils/                ← 10 validateurs + dateUtils
├── types/express.d.ts    ← Augmentation Request.user
└── templates/emailTemplates.ts ← 5 templates HTML d'emails
```

### Convention en couches

```
routes → controllers → services → prisma
```

- **Routes** : déclarent les endpoints, montées dans `app.ts` (public sous `/api/*`, admin sous `/admin/*` avec `authenticate`).
- **Controllers** : extraient les paramètres, appellent les services, traduisent les codes métier en statuts HTTP.
- **Services** : encapsulent les règles métier, renvoient `{ ok, data?, message?, code? }` et ne lèvent **jamais** d'erreur HTTP.
- **Prisma** : singleton centralisé dans `src/config/database.ts`.

## Modules métier

| Module | Modèles Prisma | Routes publiques | Routes admin |
| --- | --- | --- | --- |
| 1. Joueurs | `Categorie`, `Joueur` | `/api/players`, `/api/categories` | `/admin/players` |
| 2. Calendrier | `Evenement` | `/api/events` | `/admin/events` |
| 3. Essais | `DemandeEssai` | `/api/trials` | `/admin/trials` |
| 4. Galerie | `Album` (Json `medias`) | `/api/albums` | `/admin/albums`, `/admin/media` |
| 5. Fiches techniques | `FicheTechnique` | `/api/team-sheets` | `/admin/team-sheets` |
| 6. Blog | `Article` | `/api/blog` | `/admin/blog` |
| 7. Résultats | `Resultat`, `Classement` | `/api/results`, `/api/rankings` | `/admin/results` |
| 8. Boutique | `Produit`, `Devis` | `/api/products`, `/api/quotes` | `/admin/products`, `/admin/quotes` |
| 9. Admin | `Administrateur` | `/api/auth` | `/admin/*` (dashboard, stats, users) |
| 10. Utilisateurs | `Administrateur` | — | `/admin/users`, `/admin/profile/password` |

## Authentification

- **JWT** : `JWT_SECRET` est obligatoire (fail-fast au démarrage). `JWT_EXPIRES_IN` optionnel (défaut : `7d`).
- **Login** : `POST /api/auth/login` avec `{ email, motDePasse }` → renvoie `{ token, user }`.
- **Middleware `authenticate`** : vérifie le token `Authorization: Bearer <token>`, vérifie que l'admin existe encore en base (401 si supprimé), injecte `req.user`.
- **Mots de passe** : hashés via bcrypt (coût 10), jamais renvoyés à l'API.
- **Rôles** : `ADMIN` et `SUPER_ADMIN` (validés dans `adminService`).

## Stockage médias (MinIO/S3)

- Bucket auto-créé au démarrage (`ensureBucket`) avec policy `public-read`.
- 4 dossiers : `joueurs`, `galerie`, `blog`, `boutique`.
- Upload via `/admin/media` (multer memoryStorage, JPG/PNG/MP4/WEBM, ≤ 10 Mo).
- URLs publiques stockées en base (`S3_PUBLIC_URL/bucket/key`).
- Suppression S3 best-effort (échec loggé, suppression BDD continue).

## Emails

- **Best-effort** : sans `EMAIL_ENABLED=1` + `RESEND_API_KEY`, les emails sont ignorés silencieusement.
- 5 templates HTML : accusé de réception (essai), confirmation essai, refus essai, confirmation devis, notification devis.
- Un échec d'envoi est loggé mais ne bloque jamais la réponse HTTP.

## Base de données

### Schéma Prisma

Le schéma est dans [prisma/schema.prisma](prisma/schema.prisma). Le générateur utilise le nouveau format Prisma 7 :

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}
```

La connexion est configurée dans [prisma.config.ts](prisma.config.ts) (lit `DATABASE_URL` depuis l'environnement).

### Migrations

```bash
npm run db:migrate          # dev : crée + applique une migration
npx prisma migrate deploy   # prod : applique les migrations en attente
```

Le Dockerfile exécute automatiquement `prisma migrate deploy` avant le démarrage de l'API.

### Seed

```bash
npm run db:seed             # données de démonstration (idempotent)
npm run db:seed-media       # upload des médias S3 de démonstration
```

Le seed préserve l'administrateur (upsert) pour ne pas invalider les tokens JWT déjà émis.

## Variables d'environnement

Voir [.env.example](.env.example) pour la liste complète :

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Chaîne de connexion PostgreSQL (`postgresql://…`) |
| `DIRECT_DATABASE_URL` | Override optionnel pour l'adapter (format `postgres://`) |
| `PORT` | Port d'écoute (défaut : 3000) |
| `JWT_SECRET` | Secret de signature JWT (**obligatoire**) |
| `JWT_EXPIRES_IN` | Durée de validité des tokens (défaut : `7d`) |
| `LOG_QUERIES` | `1` pour tracer les requêtes SQL |
| `S3_ENDPOINT` | URL MinIO/S3 (conteneur : `http://minio:9000`) |
| `S3_PUBLIC_URL` | URL publique des médias (navigateur) |
| `S3_BUCKET` | Nom du bucket (défaut : `bfa-media`) |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | Identifiants S3 |
| `EMAIL_ENABLED` | `1` pour activer l'envoi réel d'emails |
| `RESEND_API_KEY` | Clé API Resend (https://resend.com) |
| `EMAIL_FROM` | Expéditeur, ex. `BFA <no-reply@domaine.com>` (domaine vérifié dans Resend) |
| `ACADEMY_EMAIL` | Boîte de réception des notifications devis |

## Qualité — Lint et tests unitaires

### ESLint

Configuration flat (`eslint.config.js`) couvrant `src/**/*.ts` et `tests/**/*.ts` :

```bash
npm run lint
```

### Tests unitaires (Vitest)

```bash
npm test                # run unique + rapport de couverture V8 (text + lcov dans coverage/)
npm run test:watch      # mode watch
```

- **461 tests** répartis sur 32 fichiers dans `tests/` — validators, services (mocks Prisma), controllers (mocks services), templates email et utils.
- Les tests sont **entièrement isolés** : Prisma et les services externes (email, S3) sont mockés — aucune base PostgreSQL ni MinIO requis.
- **Seuils de couverture** (configurés dans `vitest.config.ts`, la commande échoue en dessous) : statements, branches, fonctions, lignes ≥ 70%.

## Déploiement

### Développement (Docker Compose)

```bash
docker compose up -d        # backend + MinIO (PostgreSQL sur le host)
```

### Production (VPS + Traefik)

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Services conteneurisés :

- **PostgreSQL 16** (volume `postgres_data`, réseau interne uniquement)
- **Backend API** (routé par Traefik sur `api.bille-football-academy.com`)
- **MinIO** (routé sur `media.bille-football-academy.com` + console sur `console.bille-football-academy.com`)

Volumes persistants : `postgres_data` (BDD) + `minio_data` (médias).

> ⚠️ Ne **jamais** exécuter `docker compose down -v` en production — cela supprime les volumes et toutes les données.

## Création d'administrateurs en production

1. Démarrer le backend et laisser le seed créer l'admin initial (`admin@bfa-academy.com`).
2. Se connecter via `POST /api/auth/login`.
3. Créer les utilisateurs via `POST /admin/users` (header `Authorization: Bearer <token>`).

Alternative : insertion SQL directe dans le conteneur PostgreSQL (hash bcrypt requis).

## Notes techniques

- **TypeScript ESM** : exécuté via `tsx`, pas de build séparé. `tsconfig.json` en strict, target `ES2022`, module `ESNext`, `noEmit: true`.
- **Express 5** : les contrôleurs async renvoient leurs erreurs au middleware d'erreur global (500 générique).
- **Prisma 7** : driver adapter `@prisma/adapter-pg` obligatoire, `DATABASE_URL` au format `postgresql://`.
- **CORS** : activé globalement (à restreindre à l'origine frontend en production).
- **Logs** : Morgan en mode `dev` + `console.error`/`console.warn` pour les erreurs. Aucun `console.log` dans le code applicatif.
