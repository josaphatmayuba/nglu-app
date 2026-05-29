# SCRUM-75 Messaging Handoff

## Current integration decision

`ongdngolu.org` uses Stalwart on `mail.ongdngolu.org` for the current free self-hosted mailbox setup.

The implemented backend therefore supports:

- CRM-authenticated message CRUD under `/messages`.
- SMTP delivery for new messages using the existing backend SMTP settings.
- IMAP inbox sync from the configured mailbox.
- Authorized sender selection from the connected CRM user's `@ongdngolu.org` email, falling back to `SMTP_FROM`.
- Reply, reply-all, and forward composition in the React messaging UI.
- Permission-gated access through `create-message`, `readAll-message`, `readSingle-message`, `update-message`, and `delete-message`.

## Required environment variables for sending

Use the existing SMTP variables:

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@ongdngolu.org
IMAP_HOST=mail.ongdngolu.org
IMAP_PORT=993
IMAP_USER=
IMAP_PASS=
IMAP_MAILBOX=INBOX
```

`SMTP_FROM` should be an authorized sender for the configured SMTP account. The API refuses delivery when `SMTP_USER` or `SMTP_PASS` is missing.

## Remaining work

The current backend uses one configured IMAP account for inbox sync. If each CRM user needs a separate live inbox sync, add encrypted per-user mailbox credentials or JMAP delegation from Stalwart. Do not store mailbox passwords in clear text.
