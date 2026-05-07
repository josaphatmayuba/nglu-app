FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies with legacy peer deps
RUN npm install --legacy-peer-deps

# Copy project
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
