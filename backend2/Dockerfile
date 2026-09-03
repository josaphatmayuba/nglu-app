FROM node:20-alpine

# Plus de génération PDF serveur : les rapports HTML sont imprimés côté navigateur.

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 8001

CMD ["npm", "run", "docker:dev"]
