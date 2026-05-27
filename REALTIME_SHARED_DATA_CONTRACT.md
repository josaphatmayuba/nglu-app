# Realtime Shared Data Contract

## Channel

Redis channel:

```text
data-updates
```

## Event Type

```text
data.updated
```

## Payload

```json
{
  "type": "data.updated",
  "entity": "property",
  "action": "updated",
  "entityId": 25,
  "scope": {
    "module": "propertyManagement",
    "tenantId": null,
    "propertyId": 12,
    "unitId": null
  },
  "permissions": [
    "readAll-propertyManagement",
    "readSingle-propertyManagement"
  ],
  "tags": [
    "propertyManagement",
    "properties",
    "dashboard"
  ],
  "version": 1710000000000,
  "actorUserId": 1
}
```

## Rules

- `entity` is the changed data type, for example `property`, `unit`, `lease`, `payment`, or `maintenance`.
- `action` is one of `created`, `updated`, `deleted`, `restored`, or `status_changed`.
- `entityId` identifies the changed record.
- `scope.module` is required and should match the module in `DATA_UPDATE_RULES`.
- `permissions` are the minimum permissions needed to receive or process the event.
- `tags` identify frontend areas that should refresh.
- `version` is a positive timestamp used by consumers to order or ignore stale events.
- `actorUserId` is the user who triggered the change when known.
- Do not include full sensitive records in realtime events. Send signal, ids, scope, permissions, tags, and version only.

## Code

The backend contract lives in:

- `backend2/src/realtime/data-update-event.ts`
- `backend2/src/realtime/data-update-rules.ts`
- `backend2/src/realtime/realtime-data-publisher.service.ts`

Validate the contract with:

```bash
node scripts/check-data-update-event-contract.mjs
node scripts/check-data-update-rules.mjs
```

## Redis Configuration

The publisher is optional at runtime. If Redis is not configured or unavailable, business mutations must continue to succeed and the backend logs a warning.

Environment variables:

- `REDIS_URL`
- `REDIS_ENABLED` defaults to `true`; set `false` to disable Redis Pub/Sub without blocking business writes.
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `REDIS_CHANNEL_DATA_UPDATES` defaults to `data-updates`

Docker stacks:

- Local `docker-compose.yml` includes Redis and exposes it on `localhost:6379` for development tools.
- Dev `docker-compose.dev.yml` includes `nglu_dev_redis` on the private dev network.
- Prod `docker-compose.prod.yml` includes `nglu_prod_redis` on the private prod network.

Nginx/SSE routing:

- The frontend SSE client must keep using `/api/events/me`.
- Nginx routes `/api/events/*` to middleware/backend after stripping `/api/`.
- Nginx disables buffering and cache for SSE streams.
- Production routing remains: marketing at `https://ongdngolu.org/`, CRM entry at `https://ongdngolu.org/crm`, API/SSE under `https://ongdngolu.org/api/*`.

Validate the deploy contract with:

```bash
node scripts/check-realtime-deploy-contract.mjs
docker-compose config --quiet
docker-compose -f docker-compose.dev.yml config --quiet
docker-compose -f docker-compose.prod.yml config --quiet
```
