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

Validate the contract with:

```bash
node scripts/check-data-update-event-contract.mjs
node scripts/check-data-update-rules.mjs
```
