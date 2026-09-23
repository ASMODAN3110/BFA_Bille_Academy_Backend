# Dockerfile — BFA Bille Football Academy (backend)
# Image minimaliste : Node + dépendances + client Prisma généré, app lancée via tsx
# (le projet tourne en TypeScript/ESM sans étape de build — on garde les devDeps).

# --- Étape 1 : Builder ---
FROM node:22-slim AS builder

WORKDIR /app

# Installer openssl (requis par Prisma)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Manifestes copiés d'abord pour profiter du cache des couches npm.
COPY package*.json ./
COPY prisma ./prisma/

# Installation complète (devDeps inclus : tsx, prisma CLI, etc.)
RUN npm ci

# DATABASE_URL factice pour `prisma generate` (exigé par Prisma) ;
# écrasée au runtime par docker-compose / .env
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bfa_bille_academy?schema=public"

# Générer le client Prisma
RUN npx prisma generate

# --- Étape 2 : Image finale ---
FROM node:22-slim

WORKDIR /app

# Installer openssl + tini (gestion propre des signaux) + curl (healthcheck)
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl tini curl \
    && rm -rf /var/lib/apt/lists/*

# Copier les node_modules et le client Prisma depuis le builder
COPY --from=builder /app/node_modules ./node_modules

# Copier les sources (node_modules, generated/prisma, .env, ... exclus via .dockerignore)
COPY . .

# S'assurer que le client Prisma généré est présent
RUN npx prisma generate

# Créer un utilisateur non-root
RUN groupadd -r nodejs && useradd -r -g nodejs -m nodejs \
    && chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 4000

# Healthcheck (optionnel mais recommandé)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# tini comme init (bonne gestion des signaux SIGTERM/SIGINT)
ENTRYPOINT ["/usr/bin/tini", "--"]

# Applique les migrations au démarrage, puis lance le serveur (tsx, TS/ESM).
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]