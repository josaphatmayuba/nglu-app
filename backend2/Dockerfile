FROM node:20-alpine

# Génération PDF déléguée au microservice `pdf-service` (chromium isolé là-bas).
# backend2 n'embarque plus chromium/puppeteer.

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 8001

CMD ["npm", "run", "docker:dev"]
