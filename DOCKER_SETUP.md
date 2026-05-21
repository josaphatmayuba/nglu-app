# NgluERP - Docker Setup Guide

## Prerequisites

- Docker Desktop installed
- Docker Compose installed

## Current Backend Rule

`backend2/` is the active NestJS API. Local frontend calls must target `http://localhost:8001`.

`backend/` is the deprecated Laravel backend. It is kept for historical reference and legacy checks only. Do not add new APIs, business rules, or schema work in Laravel unless a Jira ticket explicitly asks for legacy cleanup.

## Quick Start

### 1. Copy the Docker environment files

```bash
# Active backend
cp backend2/.env.example backend2/.env

# Frontend
cp frontend/.env.docker frontend/.env
```

If `backend2/.env.example` is not present in your checkout, use the Docker Compose defaults and keep the frontend API variables on port `8001`.

### 2. Start the current local stack

```bash
docker compose up -d
```

This starts:

- Backend2 API (NestJS, active): `http://localhost:8001`
- Frontend app: `http://localhost:3000`
- Database: MySQL on `localhost:3306`
- Marketing site: `http://localhost:3002`
- Mailpit: `http://localhost:8025`
- phpMyAdmin: `http://localhost:8080`

The Laravel service does not start by default. Start it only for historical checks:

```bash
docker compose --profile legacy-laravel up -d backend
```

### 3. Wait for services to be ready

The first startup takes a few minutes as it builds containers, installs dependencies, runs backend2 Drizzle migrations/seeders, and starts Vite.

Check logs:

```bash
docker compose logs -f backend2
docker compose logs -f frontend
docker compose logs -f mysql
```

## Useful Docker Commands

### View logs

```bash
docker compose logs -f
docker compose logs -f backend2
docker compose logs -f frontend
```

### Stop services

```bash
docker compose stop
```

### Restart services

```bash
docker compose restart
```

### Down

```bash
docker compose down
```

### Execute commands in containers

```bash
# Backend2 Drizzle migrations and seeders
docker compose exec backend2 npm run db:migrate:run
docker compose exec backend2 npm run db:seed

# Shells
docker compose exec backend2 sh
docker compose exec frontend sh

# Frontend packages
docker compose exec frontend npm install
```

Laravel commands are historical only. Avoid `docker compose exec backend php artisan ...` for new development.

## Database

The MySQL container is exposed on `localhost:3306`.

- Database: `nglu_db`
- User: `nglu_user`
- Password: `password`

Connect with MySQL Workbench, TablePlus, DBeaver, or phpMyAdmin.

### Reset backend2-managed data

```bash
docker compose exec backend2 npm run db:migrate:run
docker compose exec backend2 npm run db:seed
```

Do not use Laravel migrations for new schema work. The shared MySQL schema is mapped in `backend2/src/database/schema.ts`.

## Database Backup

```bash
# Backup
docker compose exec mysql mysqldump -u nglu_user -ppassword nglu_db > backup.sql

# Restore
docker compose exec -T mysql mysql -u nglu_user -ppassword nglu_db < backup.sql
```

## Troubleshooting

### Port already in use

If a host port is already in use, edit `docker-compose.yml` and change only the host side:

```yaml
ports:
  - "8002:8001" # host:container for backend2
```

### Database connection issues

Make sure MySQL is running:

```bash
docker compose ps
docker compose logs -f mysql
```

### Clean rebuild

```bash
docker compose down -v
docker compose up -d --build
```

### Container details

```bash
docker compose ps
docker stats
```

## Environment Variables

Edit these files to customize:

- `backend2/.env`: active NestJS API configuration
- `frontend/.env`: React/Vite configuration, local API variables should target `http://localhost:8001`
- `backend/.env`: deprecated Laravel configuration, only when using the `legacy-laravel` profile

## Development Workflow

1. Backend2 code changes reload through the mounted volume.
2. Frontend code changes reload through Vite HMR.
3. Backend2 database changes go through Drizzle schema/migrations and `docker compose exec backend2 npm run db:migrate:run`.
4. Laravel changes are avoided for new work. `backend/` is deprecated and should only be edited for explicit legacy cleanup tasks.

## Production Deployment

Production uses `docker-compose.prod.yml` and serves the active API through backend2/middleware. See `DEPLOY.md` and `DEVELOPMENT_RULES.md` before deploying.
