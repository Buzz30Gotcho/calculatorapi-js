# Microservice d'historique : Express + PostgreSQL.
FROM node:20-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js auth.js ./
EXPOSE 4500
CMD ["node", "server.js"]
