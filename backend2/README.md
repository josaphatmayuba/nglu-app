# NgluERP Backend2

Second backend for progressive migration from Laravel to NestJS.

Stack:

- NestJS
- Drizzle ORM
- MySQL

## Local Docker URL

- API: `http://localhost:8001`
- Swagger: `http://localhost:8001/api-docs`
- Health: `http://localhost:8001/health`
- DB check: `http://localhost:8001/health/db`

## First migrated-compatible endpoint

- `GET /transaction-type`
- `GET /transaction-type/:id`
- `POST /transaction-type`
- `PATCH /transaction-type/:id`
- `DELETE /transaction-type/:id`
- `GET /sub-accounts`
- `GET|POST /transaction`
- `GET|PUT|PATCH /transaction/:id`
- `GET|POST /account`
- `GET /account?query=ma`
- `GET /account?query=tb`
- `GET /account?query=bs`
- `GET /account?query=is`
- `GET /account?type=sa`
- `GET|PUT|PATCH /account/:id`
- `GET|POST /customer`
- `GET /customer?query=all`
- `GET /customer?query=info`
- `GET /customer?query=search&key=...`
- `GET /customer?query=report`
- `GET|PUT|PATCH /customer/:id`
- `GET|POST /currency`
- `GET /currency?query=all`
- `GET /currency?query=search&key=...`
- `GET|PUT|PATCH /currency/:id`
- `GET|POST /discount`
- `GET /discount?query=all`
- `GET|PUT|PATCH /discount/:id`
- `GET|POST /payment-method`
- `GET /payment-method?query=all`
- `GET /payment-method?query=search&key=...`
- `PUT|PATCH /payment-method/:id`
- `GET|POST /supplier`
- `GET /supplier?query=all`
- `GET /supplier?query=info`
- `GET /supplier?query=search&key=...`
- `GET /supplier?query=report`
- `GET|PUT|PATCH /supplier/:id`
- `GET /property-management/dashboard`
- `GET /property-management/tenants`
- `GET|POST /property-management/properties`
- `PUT|PATCH|DELETE /property-management/properties/:id`
- `GET|POST /property-management/units`
- `PUT|PATCH|DELETE /property-management/units/:id`
- `GET|POST /property-management/leases`
- `PUT|PATCH|DELETE /property-management/leases/:id`
- `GET|POST /property-management/payments`
- `GET|POST /property-management/maintenance`
- `PUT|PATCH|DELETE /property-management/maintenance/:id`

These read the same MySQL tables used by the Laravel backend.

## Development

```bash
npm install
npm run dev
```

The Docker Compose service injects the same MySQL credentials used by Laravel.

## Drizzle

The Drizzle schema is in `src/database/schema.ts` and maps to the existing Laravel tables. Laravel can remain responsible for migrations while backend2 progressively adopts API modules.
