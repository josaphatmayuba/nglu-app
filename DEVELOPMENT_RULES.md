# Development Rules

This file captures project-wide rules that every future task and agent must follow.

## Local Runtime Policy

All local application runtimes must be started through Docker only.

Rules:

- Do not start local app servers directly with `npm run dev`, `vite`, `npm start`, `node`, or any other command that opens a host port outside Docker.
- Do not expose or use direct local dev URLs such as `http://127.0.0.1:5173/farmos/` for project apps.
- Use the repo Docker workflow for local validation, for example `docker-compose up`, `docker-compose restart`, `docker-compose ps`, and `docker-compose logs`.
- Before giving the user a local URL, verify the URL and port exposed by Docker.

## Jira Task Scope Policy

Every Jira task must be implemented within the requested scope only.

Default behavior:

- Do not remove, disable, hide, rename, or rewrite existing functionality unless the Jira task explicitly asks for it.
- Preserve existing user workflows, routes, API contracts, permissions, validations, realtime behavior, and deployment behavior unless the task clearly requires a targeted change.
- Prefer the smallest safe change that satisfies the task and fits the existing code patterns.
- **Never destroy or revert code/features that were implemented by previous Jira tickets** unless the current task explicitly requires it. This includes: database migrations, API endpoints, UI components, permissions, validations, business logic, and configuration. If a previous ticket's work appears to conflict with the current task, document the conflict and ask the user for clarification before removing it.
- If a task appears to require removing or materially reducing an existing feature, stop first and inform the user of the risk, affected functionality, and safer alternatives before making that change.
- If a task mentions deletion or removal, apply the Deletion Policy below and document the risk before implementation.
- When creating Jira comments or handoff notes, explicitly mention any existing behavior that was intentionally preserved when there is a risk of regression.

## Deletion Policy

Any user-facing "delete", "remove", "supprimer" or "retirer" task must be treated as a soft delete by default.

Default behavior:

- Do not physically delete database rows.
- Set `status=false` or the existing equivalent inactive flag.
- Hide inactive records from normal list views by default.
- Keep backend permission checks for the delete action.
- Keep frontend permission checks for the delete button/action.
- Keep a confirmation step before applying `status=false`.
- Preserve related historical records for audit, reports, payments, contracts, invoices and future restoration.

Physical deletion is allowed only when the task explicitly says it is a hard delete and the owner confirms the data can be permanently removed.

When creating Jira tasks, implementation notes, handoff files or bug reports, include this rule whenever a deletion feature is mentioned:

> Suppression logique uniquement: set `status=false`; no physical delete unless explicitly approved.

## Jira Workflow Policy

Every agent working with Jira must keep the issue status aligned with the real state of the work:

- When implementation starts, move the issue to `In Progress`.
- While working, add Jira comments with useful technical notes, changed files, blockers, and validation results so another agent can continue without re-investigating.
- Every task must include technical validation appropriate to the change: lint, typecheck, build, automated tests, focused scripts, or migration checks.
- Every frontend or user-visible task must include UI validation before it is considered ready. Prefer local browser validation first, then dev/prod validation when the task requires deployment.
- At the end of each task, do not deploy manually to AWS dev by default. Commit and push the validated code; Bitbucket pipelines are responsible for deployment. Manual AWS deployment is allowed only when the user explicitly asks for it.
- After a task is implemented and validated, push the code to the `develop` branch so Bitbucket can deploy it. If pushing is blocked, document the blocker in Jira and in the final handoff.
- Frontend deployments to AWS dev must be built with `npm run build:dev`, not plain `npm run build`, so the compiled bundle points to `https://dev.ongdngolu.org/api`. Production deployments must use `npm run build:prod`.
- After every code or configuration change, run an appropriate verification before changing the Jira status. Verification must prove the changed behavior still works, not only that files were edited.
- When code is implemented but still needs QA, user confirmation, staging verification, or deployment validation, move the issue to `Test`.
- Move the issue to `Done` only after final validation is completed. Final validation means the agent has verified the feature/bug fix end-to-end in the relevant UI or runtime environment, or has clearly documented why that validation could not be performed.
- Before moving a task to `Done`, re-check the latest deployed/runtime state after the final change. If anything remains unverified, blocked, or only validated locally, keep the task in `Test` and document what still needs validation.
- Do not mark an issue `Done` just because code was written. If the user still needs to test it, the correct status is `Test`.
- Jira comments must explicitly say what was tested, where it was tested, and what remains unverified.

## Versioning Policy

Every future code or configuration change must be traceable to an application version.

Rules:

- The root `VERSION` file is the single base application version.
- The deployed/build version is `VERSION` plus the short Git commit, for example `3.0.0+a422077`.
- Run `node scripts/version-info.mjs` before Jira handoff or deployment comments.
- Update `CHANGELOG.md` under `[Unreleased]` for every code/config change before committing.
- Include the Jira key in the changelog entry when one exists.
- Do not bump `VERSION` for every small commit. Bump it only for approved release/version increments:
  - `PATCH` for bug fixes, security hardening and small corrections.
  - `MINOR` for backward-compatible features.
  - `MAJOR` for breaking changes.
- Jira comments after validation must include the base version, build version, commit hash and validation summary.
- See `VERSIONING.md` for the complete workflow.

## Routing Policy

The public marketing site and CRM must stay separated:

- `https://ongdngolu.org/` serves the marketing site.
- `https://ongdngolu.org/crm` is the CRM entry point.
- Do not move the CRM back to the domain root.

## Data Entry UX Policy

- Phone fields must use an international phone input with a visible country indicator and dialing code. Default to Congo DRC (`+243`) when no country is known, and store the normalized international value whenever the backend accepts it.
- Money fields must never be plain number inputs. Any salary, rent, amount, fee, budget, price, income, payment, deposit, or balance field must show the currency beside the amount through a currency selector or adjacent currency code/symbol.
- Currency values must come from the database/configuration (`currency` + `setting`) where available. Do not hardcode business amounts or fake currencies in frontend data files.
- Money displays must include the currency code/symbol everywhere, including cards, tables, modals, exports, tenant files, HR profiles, and summaries.

## Frontend Dev Deployment Policy

This section exists because of two past deployment incidents:

**SCRUM-84** — Two mistakes combined:
- A dev frontend bundle was deployed with the wrong API target.
- The bind-mounted `frontend/dist` directory was deleted and recreated while nginx was running, leaving the container mounted to an empty/deleted inode.

**2026-05-22 incident** — An agent ran `npm run build` (no mode) during a TypeScript verification step, which silently overwrote `frontend/dist` with a bundle pointing to `ongdngolu.org/api` (prod). The subsequent deploy used `-SkipLocalBuild` and shipped that broken dist to dev. Result: `dev.ongdngolu.org` was calling the prod backend.

Rules:

- Manual AWS dev **frontend** deployments must use `scripts/deploy-dev-aws.ps1` from the repo root unless a ticket explicitly documents why a different path is required.
- Manual AWS dev **backend2** deployments must use `scripts/deploy-dev-backend-aws.ps1` from the repo root. Never SCP the dist manually or restart the container by hand — the script ensures the correct compose project, env file, and health check.
- Manual AWS dev **middleware** deployments must use `scripts/deploy-dev-middleware-aws.ps1` from the repo root. The middleware has no build step; the script packs `middleware/src/`, uploads it, and rebuilds the container image on the server.
- Manual AWS production deployments must use `scripts/deploy-prod-aws.ps1` from the repo root unless a release ticket explicitly documents why a different path is required.
- The deployment script lock at `/tmp/nglu-dev-deploy.lock` must be respected. Do not deploy if another agent is already deploying.
- The production deployment script lock at `/tmp/nglu-prod-deploy.lock` must be respected. Do not deploy production if another agent is already deploying.
- For `dev.ongdngolu.org`, always build from `frontend/` with `npm run build:dev`.
- For production, always build from `frontend/` with `npm run build:prod`.
- **Never run `npm run build` (no mode suffix) anywhere in this project.** It is blocked (exits 1) and produces a bundle with no guaranteed API target. To verify that frontend code compiles without building a deployable artifact, use `npx tsc --noEmit` instead.
- Never deploy dev frontend with plain `npm run build`.
- Never `rm -rf frontend/dist` on AWS while `nglu_prod_frontend` is serving it as a bind mount.
- Prefer replacing the contents inside the existing `frontend/dist` directory, or recreate `nglu_prod_frontend` immediately after replacing the directory.
- After deploying dev frontend, verify the bundle target with `npm run assert:api:dev` locally or by grepping the deployed dist for `https://dev.ongdngolu.org/api`. The deploy script does this automatically — do not bypass it.
- After deploying dev frontend, validate `https://dev.ongdngolu.org/admin/company-setting` or another direct `/admin/*` route returns `200`, not nginx `404`.
- After deploying production frontend, run `node scripts/smoke-routing-contract.mjs --base https://ongdngolu.org` and verify the CRM stays under `/crm`.
- Do not build the full CRM frontend directly on the small Lightsail instance when memory is constrained. Build `frontend/dist` locally or in CI and deploy the artifact with `scripts/deploy-dev-aws.ps1`.

Standard dev deployment command (covers build + assert + upload + smoke):

```powershell
.\scripts\deploy-dev-aws.ps1
```

If `npm run build:dev` was already run in the current session and `frontend/dist` is fresh:

```powershell
.\scripts\deploy-dev-aws.ps1 -SkipLocalBuild
```

The script asserts the API target locally before uploading even with `-SkipLocalBuild`. There is no way to bypass this check.

## AWS Deployment Coordination

Before any manual AWS deploy, an agent must check whether another agent is already deploying or has just announced a deploy in the current conversation/Jira handoff.

Rules:

- If another agent is already deploying to AWS dev/prod, do not start a second deployment.
- Commit and push your code first, then wait for the active deployment to finish or ask the user before deploying.
- Announce before starting an AWS deploy and say which environment, commit, and services are being updated.
- After deployment, comment in Jira with the commit, environment, commands/validation, and any blockers.
- Do not interrupt, rebuild, restart, or overwrite a running deployment started by another agent unless the user explicitly asks you to take over.
- After deploying to AWS dev, validate the deployed app in a real browser at `https://dev.ongdngolu.org`: open the UI, log in with the demo account `demo` / `5555`, navigate to the relevant screen, and confirm the implemented work is present and functional.
- During AWS dev browser validation, inspect failed network requests and visible UI errors. If a bug appears, determine whether it was caused by the agent's change/deploy. If it was caused by the agent, fix it before handoff. If it is unrelated, create a Jira bug with environment, steps to reproduce, actual result, expected result, and evidence from the browser/API/logs.

Manual AWS deployment SSH key note for agents:

- AWS frontend/backend server key filename: `LightsailDefaultKey-ca-central-1 (3).pem`
- AWS database server key filename: `LightsailDefaultKey-us-east-1-database.pem`
- Do not commit PEM key contents. This note is only to identify which local key file an agent should use when manual deployment is required.

Safe AWS dev frontend deployment pattern:

```bash
# local
cd frontend
npm run build:dev
cd ..
tar -czf /tmp/ngolu-dev-frontend.tgz frontend/dist

# server
cd /opt/nglu-app-dev
mkdir -p frontend/dist
find frontend/dist -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar -xzf /tmp/ngolu-dev-frontend.tgz

# if the whole dist directory was replaced instead of only its contents,
# recreate nginx so Docker refreshes the bind mount.
cd /opt/nglu-app
docker compose -p nglu_prod -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps frontend
```
