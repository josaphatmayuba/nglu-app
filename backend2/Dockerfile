FROM node:20-alpine

# Chromium pour la génération PDF puppeteer (HR + FarmOS).
# IMPORTANT : bloc NON bloquant (voir Dockerfile.prod). L'apk peut échouer (OOM
# sur petite instance) sans casser le build. Si chromium est présent → symlink ;
# sinon le service PDF échoue proprement au runtime, le reste du backend tourne.
RUN set +e; \
    apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont || echo "WARN: apk chromium a échoué (PDF indisponible)"; \
    CHROME_BIN="$(command -v chromium || command -v chromium-browser || true)"; \
    if [ -n "$CHROME_BIN" ]; then ln -sf "$CHROME_BIN" /usr/bin/chromium && echo "chromium OK: $CHROME_BIN"; else echo "WARN: chromium absent"; fi; \
    exit 0

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 8001

CMD ["npm", "run", "docker:dev"]
