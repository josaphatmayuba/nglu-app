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
