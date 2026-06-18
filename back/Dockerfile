# ============================================================
#  Dockerfile multi-étapes : tests + production
#  (better-sqlite3 est un module natif -> outils de build requis)
# ============================================================

# --- Étape 1 : deps (dépendances COMPLÈTES, compile better-sqlite3) ---
FROM node:20-slim AS deps
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# --- Étape 2 : test (lance Jest dans le conteneur) ---
FROM deps AS test
COPY . .
CMD ["npm", "test"]

# --- Étape 3 : production (sans devDependencies) ---
FROM node:20-slim AS production
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
# Dossier de la base SQLite (monté en volume), accessible à l'utilisateur node
RUN mkdir -p /app/data && chown -R node:node /app
EXPOSE 3000
USER node
CMD ["node", "src/server.js"]
