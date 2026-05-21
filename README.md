# NgluERP

## Backend API status

`backend2/` is the active API for local, development, and production work. It is the NestJS service exposed on port `8001` locally and through the middleware/nginx stack in deployed environments.

`backend/` is the legacy Laravel backend. It is deprecated and kept only for historical reference, old migration context, and compatibility checks while the migration remains documented. Do not add new API endpoints, business rules, or feature work in `backend/`.

The MySQL schema created during the Laravel phase is still shared. NestJS maps the existing tables through Drizzle in `backend2/src/database/schema.ts`, and new schema changes should be added through the current backend2 migration flow unless a task explicitly says otherwise.

## Development rule

For new backend work:

- Add or update APIs in `backend2/`.
- Keep Laravel edits limited to documented cleanup or historical reference tasks.
- Validate backend changes with `cd backend2 && npm run build` before pushing.

See `DEPLOY.md`, `INSTALLATION_STATUS.md`, and `DEVELOPMENT_RULES.md` for deployment and Jira workflow rules.
