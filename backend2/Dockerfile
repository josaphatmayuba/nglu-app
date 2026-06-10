FROM node:20-alpine

# Chromium dependencies for puppeteer PDF generation
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Alpine installe le binaire en /usr/bin/chromium (le code resout aussi chromium-browser en repli).
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 8001

CMD ["npm", "run", "docker:dev"]
