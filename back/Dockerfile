
# --- Étape 1 : deps (toutes les dépendances, dont dev pour les tests) ---
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Étape 2 : test (Jest dans le conteneur) ---
FROM deps AS test
COPY . .
CMD ["npm", "test"]

# --- Étape 3 : production (sans devDependencies) ---
FROM node:20-slim AS production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
EXPOSE 3000
USER node
CMD ["node", "src/server.js"]
