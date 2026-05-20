# Development Rules

This file captures project-wide rules that every future task and agent must follow.

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
- At the end of each task, update the AWS dev environment (`dev.ongdngolu.org`) so the user can test the latest work. If deployment is blocked, document the blocker in Jira and in the final handoff.
- After a task is implemented and validated, push the code to the `develop` branch so the remote branch matches the AWS dev environment. If pushing is blocked, document the blocker in Jira and in the final handoff.
- Frontend deployments to AWS dev must be built with `npm run build:dev`, not plain `npm run build`, so the compiled bundle points to `https://dev.ongdngolu.org/api`. Production deployments must use `npm run build:prod`.
- When code is implemented but still needs QA, user confirmation, staging verification, or deployment validation, move the issue to `Test`.
- Move the issue to `Done` only after final validation is completed. Final validation means the agent has verified the feature/bug fix end-to-end in the relevant UI or runtime environment, or has clearly documented why that validation could not be performed.
- Do not mark an issue `Done` just because code was written. If the user still needs to test it, the correct status is `Test`.
- Jira comments must explicitly say what was tested, where it was tested, and what remains unverified.

## Routing Policy

The public marketing site and CRM must stay separated:

- `https://ongdngolu.org/` serves the marketing site.
- `https://ongdngolu.org/crm` is the CRM entry point.
- Do not move the CRM back to the domain root.

## Frontend Dev Deployment Policy

This section exists because SCRUM-84 was caused by two deployment mistakes:

- A dev frontend bundle was deployed with the wrong API target.
- The bind-mounted `frontend/dist` directory was deleted and recreated while nginx was running, leaving the container mounted to an empty/deleted inode.

Rules:

- For `dev.ongdngolu.org`, always build from `frontend/` with `npm run build:dev`.
- For production, always build from `frontend/` with `npm run build:prod`.
- Never deploy dev frontend with plain `npm run build`.
- Never `rm -rf frontend/dist` on AWS while `nglu_prod_frontend` is serving it as a bind mount.
- Prefer replacing the contents inside the existing `frontend/dist` directory, or recreate `nglu_prod_frontend` immediately after replacing the directory.
- After deploying dev frontend, verify the bundle target with `npm run assert:api:dev` locally or by grepping the deployed dist for `https://dev.ongdngolu.org/api`.
- After deploying dev frontend, validate `https://dev.ongdngolu.org/admin/company-setting` or another direct `/admin/*` route returns `200`, not nginx `404`.

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
