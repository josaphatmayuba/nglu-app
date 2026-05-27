# SCRUM-75 Messaging Handoff

## Current integration decision

`ongdngolu.org` currently has no MX record published. A DNS MX lookup on 2026-05-27 returned the AWS Route 53 SOA only, so inbound mailbox sync cannot be completed until the domain is connected to a mail provider.

The implemented backend therefore supports:

- CRM-authenticated message CRUD under `/messages`.
- SMTP delivery for new messages using the existing backend SMTP settings.
- Permission-gated access through `create-message`, `readAll-message`, `readSingle-message`, `update-message`, and `delete-message`.

## Required environment variables for sending

Use the existing SMTP variables:

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@ongdngolu.org
```

`SMTP_FROM` should be an authorized sender for the configured SMTP account. The API refuses delivery when `SMTP_USER` or `SMTP_PASS` is missing.

## Remaining work for real inbox sync

After the domain has a real mail provider and MX records:

1. If Microsoft 365: use Graph API with OAuth and delegated/shared mailbox permissions.
2. If Google Workspace: use Gmail API with OAuth/domain-wide delegation.
3. If classic hosting: use IMAP for inbox reads and SMTP for sending.

Do not store mailbox passwords in clear text. Prefer OAuth tokens, encrypted at rest, and scope each connected mailbox to the CRM permissions/roles allowed to access it.
