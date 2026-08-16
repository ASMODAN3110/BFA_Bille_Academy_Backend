# Dockerfile — BFA Bille Football Academy (backend)
# Image minimaliste : Node + dépendances + client Prisma généré, app lancée via tsx
# (le projet tourne en TypeScript/ESM sans étape de build — on garde les devDeps).

FROM node:26-slim

WORKDIR /app

# Manifestes copiés d'abord pour profiter du cache des couches npm.
COPY package*.json ./
RUN npm ci

# Sources (node_modules, generated/prisma, .env, ... exclus via .dockerignore).
COPY . .

# DATABASE_URL factice pour `prisma generate` (exigé par la config Prisma 7) ;
# écrasée au runtime par docker-compose.
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bfa_bille_academy?schema=public"
RUN npx prisma generate

EXPOSE 4000

# Applique les migrations au démarrage, puis lance le serveur (tsx, TS/ESM).
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
