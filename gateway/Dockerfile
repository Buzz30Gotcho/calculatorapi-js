# Passerelle API en Node/Express (reverse proxy vers les microservices).
FROM node:20-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
EXPOSE 8088
CMD ["node", "server.js"]
