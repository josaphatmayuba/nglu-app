# Production Routing Contract

This file is intentionally short and explicit so future deploy work does not move the CRM back to the domain root.

For project-wide implementation rules, read `DEVELOPMENT_RULES.md`. In particular, user-facing deletion means soft delete with `status=false` unless a hard delete is explicitly approved.

## ongdngolu.org

- `https://ongdngolu.org/` serves the built Vue marketing site from `marketing-site/dist/`.
- `https://ongdngolu.org/crm` is the public CRM entry point.
- The CRM React app currently keeps its internal routes under `/admin/*`.
- Vite CRM assets are emitted under `/assets/*`, so nginx reserves `/assets/*` for the CRM build.
- `https://ongdngolu.org/api/*` proxies to middleware/backend.

## Files That Enforce This

- `nginx/nginx.frontend.conf`
- `docker-compose.prod.yml`
- `DEPLOY.md`
- `marketing-site/README.md`

Any routing-related PR must reference this contract. If this contract changes, update all four files above in the same commit and run:

```bash
node scripts/check-routing-contract.mjs
```

## Marketing Build Rule

`marketing-site/` is a Vue/Vite app. Nginx must serve `marketing-site/dist/`, not the Vue source directory.

```bash
cd marketing-site
npm install
npm run build
```

If this contract changes, update all four places in the same commit and test:

```bash
curl -I https://ongdngolu.org/
curl -I https://ongdngolu.org/crm
curl -I https://ongdngolu.org/admin/auth/login
curl -I https://ongdngolu.org/api/health
```

For the complete post-deploy smoke checklist, use `DEPLOYMENT_SMOKE_CHECKLIST.md`.
