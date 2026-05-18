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

## Routing Policy

The public marketing site and CRM must stay separated:

- `https://ongdngolu.org/` serves the marketing site.
- `https://ongdngolu.org/crm` is the CRM entry point.
- Do not move the CRM back to the domain root.
