# Microservice d'authentification (proxy Supabase) — aucune dépendance runtime
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
EXPOSE 4000
USER node
CMD ["node", "src/server.js"]
