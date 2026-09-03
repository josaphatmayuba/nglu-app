# AWS Production Deployment Tool

Use `scripts/deploy-prod-aws.ps1` for manual AWS production deployments while Bitbucket Pipelines is unavailable or not trusted as the source of truth.

Production deploys are more guarded than dev deploys:

- real deploy requires `-ConfirmProduction DEPLOY_PROD`;
- a server-side lock prevents concurrent production deploys;
- the production routing contract is checked before build;
- smoke checks verify marketing, CRM, login, API health, and API target.

## What It Does

- Runs `node scripts/check-routing-contract.mjs`.
- Builds the CRM frontend with `npm run build:prod`.
- Builds the marketing site with `npm run build`.
- Packages:
  - `frontend/dist`
  - `marketing-site/dist`
  - production frontend support files (`docker-compose.prod.yml`, `frontend/Dockerfile.prod`, `nginx/nginx.frontend.conf`)
- Uploads the bundle to Lightsail.
- Acquires a server-side lock at `/tmp/nglu-prod-deploy.lock`.
- Replaces only the contents of:
  - `/opt/nglu-app/frontend/dist`
  - `/opt/nglu-app/marketing-site/dist`
- Ensures first-deploy `dist` directories exist for the other static apps before rebuilding the frontend image.
- Keeps mounted `dist` directories in place.
- Optionally pulls `master` on the server.
- Optionally recreates the frontend container.
- Runs smoke checks for:
  - `https://ongdngolu.org/`
  - `https://ongdngolu.org/crm`
  - `https://ongdngolu.org/admin/auth/login`
  - `https://ongdngolu.org/api/health`
  - bundled API target `https://ongdngolu.org/api`

## Static App Production Rules

All production SPAs served by `nglu_prod_frontend` must follow the same deployment model:

- Build the app in CI or locally, then deploy the built `dist` artifact.
- Store the artifact on the host under `/opt/nglu-app/<app>/dist`.
- Create missing first-deploy directories before rebuilding the nginx image.
- Rebuild the `nglu_prod-frontend` image from `frontend/Dockerfile.prod`.
- Tag the currently running frontend image as `nglu_prod-frontend:previous` before replacing the container.
- Recreate only `nglu_prod_frontend` with `docker compose -p nglu_prod ... up -d --force-recreate --no-deps frontend`.
- Run `nginx -t` plus HTTP smoke checks before considering the deploy successful.
- Roll back to `nglu_prod-frontend:previous` if the recreate or smoke checks fail.

Normal production deploys must not copy app assets directly into the running `nglu_prod_frontend` container with `docker cp`. That pattern is not durable across container recreates and has no reliable rollback. Use `scripts/ci/deploy-prod-static-app.sh` in Bitbucket or `scripts/deploy-prod-aws.ps1` manually.

If the existing `nglu_prod_frontend` container belongs to the legacy compose project `nglu-app`, tag its current image first, then remove the container and recreate it under `nglu_prod`. Because `container_name: nglu_prod_frontend` is fixed, Docker cannot keep both old and new frontend containers running with the same name.

## PEM Keys

Frontend/backend AWS production server:

```text
LightsailDefaultKey-ca-central-1 (3).pem
```

Database server:

```text
LightsailDefaultKey-us-east-1-database.pem
```

The deployment script defaults to:

```powershell
$HOME\Downloads\LightsailDefaultKey-ca-central-1 (3).pem
```

## Dry Run

From the repo root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-prod-aws.ps1 -DryRun -SkipLocalBuild
```

For a full local build dry-run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-prod-aws.ps1 -DryRun
```

## Real Production Deploy

Only run after the release is approved:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-prod-aws.ps1 -ConfirmProduction DEPLOY_PROD
```

If the server code must be updated from `master`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-prod-aws.ps1 -ConfirmProduction DEPLOY_PROD -PullServerCode
```

If the nginx bind mount needs to refresh:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-prod-aws.ps1 -ConfirmProduction DEPLOY_PROD -RestartFrontendContainer
```

## Lock Rule

The script creates `/tmp/nglu-prod-deploy.lock` on the server. If another production deployment is already running, the script stops and prints lock metadata.

Agents must not bypass this lock. If a production deployment appears stuck, verify with the user/team before deleting the lock manually.

## Required Validation Before Jira Done

After production deployment:

1. Open `https://ongdngolu.org/` and confirm the marketing site loads.
2. Open `https://ongdngolu.org/crm` and confirm redirect/login route works.
3. Login with an approved production account only if production validation requires it.
4. Run:

```bash
node scripts/smoke-routing-contract.mjs --base https://ongdngolu.org
```

5. Comment the Jira issue with:
   - commit hash;
   - build version from `node scripts/version-info.mjs`;
   - commands run;
   - browser validation result;
   - anything not verified.

Do not move Jira to `Done` without final production validation or a clear documented reason.
