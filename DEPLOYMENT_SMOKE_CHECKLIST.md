# Deployment Smoke Checklist

Use this checklist after every manual or pipeline deployment. It covers dev and prod routing, API health, Docker containers, migrations, and frontend assets.

Rules to keep in mind:

- Dev frontend builds must use `npm run build:dev`.
- Prod frontend builds must use `npm run build:prod`.
- Bitbucket pipeline may be unavailable; manual AWS deploy is then mandatory.
- Production routing contract: `https://ongdngolu.org/` is marketing, `https://ongdngolu.org/crm` is CRM.
- Do not move CRM back to the production domain root.
- AWS frontend/backend SSH key filename: `LightsailDefaultKey-ca-central-1 (3).pem`.
- AWS database SSH key filename: `LightsailDefaultKey-us-east-1-database.pem`.

## 1. Local Build Smoke

Run only what matches the deployment.

```bash
cd frontend
npm run build:dev
npm run assert:api:dev
```

```bash
cd frontend
npm run build:prod
npm run assert:api:prod
```

```bash
cd marketing-site
npm install
npm run build
```

Backend smoke:

```bash
cd backend2
npm run build
```

## 2. Development HTTP Smoke

Expected: all commands return HTTP 200.

```bash
curl -I https://dev.ongdngolu.org/
curl -I https://dev.ongdngolu.org/admin/dashboard
curl -I https://dev.ongdngolu.org/admin/property-management
curl -I https://dev.ongdngolu.org/api/health
```

Expected API body:

```bash
curl https://dev.ongdngolu.org/api/health
```

The response should include `"status":"ok"`.

## 3. Production Routing Smoke

Expected routing:

- `/` serves the marketing site.
- `/crm` serves the CRM entry point.
- `/admin/*` still resolves CRM internal routes.
- `/api/*` proxies to middleware/backend.

```bash
curl -I https://ongdngolu.org/
curl -I https://ongdngolu.org/crm
curl -I https://ongdngolu.org/admin/auth/login
curl -I https://ongdngolu.org/api/health
```

Automated equivalent:

```bash
node scripts/smoke-routing-contract.mjs
```

Expected API body:

```bash
curl https://ongdngolu.org/api/health
```

The response should include `"status":"ok"`.

For dev, run the same contract against the dev domain:

```bash
node scripts/smoke-routing-contract.mjs --base https://dev.ongdngolu.org
```

## 4. AWS Dev Server Smoke

```bash
ssh -i "LightsailDefaultKey-ca-central-1 (3).pem" admin@16.54.167.125 \
  "cd /opt/nglu-app-dev && git rev-parse --short HEAD && docker compose -p nglu_dev -f docker-compose.dev.yml ps"
```

Expected:

- Git commit matches the pushed `develop` commit.
- `nglu_dev_backend2` is Up.
- `nglu_dev_middleware` is Up.
- `nglu_dev_mysql` is Up and healthy.

Verify dev bundle target after frontend deploy:

```bash
ssh -i "LightsailDefaultKey-ca-central-1 (3).pem" admin@16.54.167.125 \
  "grep -R 'https://dev.ongdngolu.org/api' -m 1 /opt/nglu-app-dev/frontend/dist >/dev/null && echo dev_api_target_ok"
```

## 5. AWS Production Server Smoke

```bash
ssh -i "LightsailDefaultKey-ca-central-1 (3).pem" admin@16.54.167.125 \
  "cd /opt/nglu-app && git rev-parse --short HEAD && docker compose -p nglu_prod -f docker-compose.prod.yml ps"
```

Expected:

- Git commit matches the pushed `master` commit.
- `nglu_prod_frontend` is Up.
- `nglu_prod_backend2` is Up.
- `nglu_prod_middleware` is Up.

Verify prod bundle target after frontend deploy:

```bash
ssh -i "LightsailDefaultKey-ca-central-1 (3).pem" admin@16.54.167.125 \
  "grep -R 'https://ongdngolu.org/api' -m 1 /opt/nglu-app/frontend/dist >/dev/null && echo prod_api_target_ok"
```

## 6. Nginx And Asset Smoke

Run after nginx or routing changes.

```bash
ssh -i "LightsailDefaultKey-ca-central-1 (3).pem" admin@16.54.167.125 \
  "cd /opt/nglu-app && make nginx-test"
```

Frontend asset availability:

```bash
curl -I https://dev.ongdngolu.org/assets/
curl -I https://ongdngolu.org/assets/
```

If directory listing returns 403, that is acceptable. A 404 on hashed assets loaded by the page is not acceptable; check browser network logs or the built `index.html` asset names.

## 7. Migration Smoke

Check recent backend logs after deploy:

```bash
ssh -i "LightsailDefaultKey-ca-central-1 (3).pem" admin@16.54.167.125 \
  "docker logs nglu_dev_backend2 --tail 120"
```

```bash
ssh -i "LightsailDefaultKey-ca-central-1 (3).pem" admin@16.54.167.125 \
  "docker logs nglu_prod_backend2 --tail 120"
```

Expected:

- No migration failure.
- No repeated DB connection failure.
- No crash loop.

## 8. Jira Handoff Template

Paste this structure into the Jira comment before moving a ticket to TEST:

```text
Commit:
- <short sha> <message>

Validation:
- Build/lint/test:
- Dev deploy:
- HTTP smoke:
- Docker smoke:
- Bundle API target:
- Remaining QA:
```

Move the ticket to TEST when the code is deployed and ready for user validation. Move it to Done only after final validation is complete.
