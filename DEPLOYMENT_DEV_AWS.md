# AWS Dev Deployment Tool

Use `scripts/deploy-dev-aws.ps1` for manual AWS dev deployments while Bitbucket Pipelines is unavailable.

This is the official dev deployment path for agents. It keeps deployments repeatable and prevents two agents from deploying at the same time.

## What It Does

- Builds the frontend with `npm run build:dev`.
- Runs the existing dev API target assertion from the frontend build.
- Packages `frontend/dist`.
- Uploads the bundle to Lightsail.
- Acquires a server-side lock at `/tmp/nglu-dev-deploy.lock`.
- Replaces only the contents of `/opt/nglu-app-dev/frontend/dist`.
- Keeps the mounted `frontend/dist` directory itself in place.
- Optionally pulls `develop` on the server.
- Optionally recreates the frontend container.
- Runs smoke checks for:
  - routing contract via `node scripts/smoke-routing-contract.mjs --base https://dev.ongdngolu.org`
  - `https://dev.ongdngolu.org/`
  - `https://dev.ongdngolu.org/admin/dashboard`
  - `https://dev.ongdngolu.org/admin/company-setting`
  - `https://dev.ongdngolu.org/api/health`
  - bundled API target `https://dev.ongdngolu.org/api`

## PEM Keys

Frontend/backend AWS dev server:

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

Override it when needed:

```powershell
.\scripts\deploy-dev-aws.ps1 -PemPath "C:\path\to\LightsailDefaultKey-ca-central-1 (3).pem"
```

## Standard Dev Frontend Deploy

From the repo root:

```powershell
.\scripts\deploy-dev-aws.ps1
```

If Windows blocks local script execution, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-dev-aws.ps1
```

Use dry-run to verify local prerequisites and see the target without uploading:

```powershell
.\scripts\deploy-dev-aws.ps1 -DryRun
```

If the nginx bind mount needs to refresh, recreate only the frontend container:

```powershell
.\scripts\deploy-dev-aws.ps1 -RestartFrontendContainer
```

If the server code must be updated before replacing the bundle:

```powershell
.\scripts\deploy-dev-aws.ps1 -PullServerCode
```

## Lock Rule

The script creates `/tmp/nglu-dev-deploy.lock` on the server. If another deployment is already running, the script stops and prints the lock metadata.

Agents must not bypass this lock. If a deployment appears stuck, verify with the team before deleting the lock manually.

## Required Validation Before Jira Done

After deployment:

1. Open `https://dev.ongdngolu.org`.
2. Login with `demo/5555`.
3. Verify the feature or bug fix in the browser.
4. If a bug appears, decide whether it was caused by the current change.
5. If the bug is unrelated, create a Jira bug ticket.
6. Comment the Jira issue with:
   - commit hash;
   - build version from `node scripts/version-info.mjs`;
   - commands run;
   - browser validation result;
   - anything not verified.

Do not move Jira to `Done` without this validation. Use `Test` when the user still needs to confirm.
