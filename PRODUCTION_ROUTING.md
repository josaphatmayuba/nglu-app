# Production Routing Contract

This file is intentionally short and explicit so future deploy work does not move the CRM back to the domain root.

## ongdngolu.org

- `https://ongdngolu.org/` serves `marketing-site/`.
- `https://ongdngolu.org/crm` is the public CRM entry point.
- The CRM React app currently keeps its internal routes under `/admin/*`.
- Vite CRM assets are emitted under `/assets/*`, so nginx reserves `/assets/*` for the CRM build.
- `https://ongdngolu.org/api/*` proxies to middleware/backend.

## Files That Enforce This

- `nginx/nginx.frontend.conf`
- `docker-compose.prod.yml`
- `DEPLOY.md`
- `marketing-site/README.md`

If this contract changes, update all four places in the same commit and test:

```bash
curl -I https://ongdngolu.org/
curl -I https://ongdngolu.org/crm
curl -I https://ongdngolu.org/admin/auth/login
curl -I https://ongdngolu.org/api/health
```
