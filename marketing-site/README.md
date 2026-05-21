# ONGD NGOLU - Marketing Site

Vue/Vite public website for ONGD NGOLU.

## Routing Contract

- `https://ongdngolu.org/` serves this marketing site.
- `https://ongdngolu.org/crm` is the CRM entry point.
- The CRM React app keeps its internal routes under `/admin/*`.
- Do not move the CRM back to `/`.

The production nginx container serves the built output from `marketing-site/dist/`.
It must not serve the Vue source directory directly.

## Stack

- Vue 3
- Vite
- Plain CSS
- Static logo in `static/logo.png`

## Local Development

```bash
cd marketing-site
npm install
npm run dev
```

Default local URL: `http://localhost:5173`.

With the root Docker stack:

```bash
docker compose up marketing-site
```

Docker local URL: `http://localhost:3002`.

## Build

```bash
cd marketing-site
npm install
npm run build
```

Output: `marketing-site/dist/`.

## Dev / Prod Deploy Notes

The shared nginx config expects:

- Prod marketing build: `/opt/nglu-app/marketing-site/dist`
- Dev marketing build: `/opt/nglu-app-dev/marketing-site/dist`

After updating the marketing site on the server:

```bash
cd /opt/nglu-app/marketing-site
npm install
npm run build
docker exec nglu_prod_frontend nginx -s reload
```

For dev:

```bash
cd /opt/nglu-app-dev/marketing-site
npm install
npm run build
docker exec nglu_prod_frontend nginx -s reload
```

## Sections

1. Hero: public ONGD NGOLU positioning and CTA.
2. Mission: agriculture, social impact and digital management.
3. Programs: operational pillars.
4. Impact: explicit reminder that CRM stays under `/crm`.

## Agent Notes

If the marketing/CRM routing changes, update these files together:

- `nginx/nginx.frontend.conf`
- `docker-compose.prod.yml`
- `DEPLOY.md`
- `PRODUCTION_ROUTING.md`
- `marketing-site/README.md`

Then run:

```bash
node ../scripts/check-routing-contract.mjs
```
