# NgluERP - Docker Setup Guide

## Prerequisites
- Docker Desktop installed
- Docker Compose installed

## Quick Start

### 1. Copy the docker environment files (or use automatic setup via docker-compose)
```bash
# Backend
cp backend/.env.docker backend/.env

# Frontend
cp frontend/.env.docker frontend/.env
```

### 2. Start all services
```bash
docker-compose up -d
```

This will start:
- **Backend API**: http://localhost:8000
- **Frontend App**: http://localhost:3000
- **Database**: MySQL on port 3306
- **Mailpit** (email testing): http://localhost:8025

### 3. Wait for services to be ready
The first startup takes a few minutes as it:
- Installs composer dependencies
- Generates Laravel app key
- Runs database migrations
- Installs npm dependencies

Check logs:
```bash
docker-compose logs -f backend
docker-compose logs -f backend2
docker-compose logs -f frontend
```

## Useful Docker Commands

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f backend2
docker-compose logs -f frontend
```

### Stop services
```bash
docker-compose stop
```

### Restart services
```bash
docker-compose restart
```

### Down (remove containers)
```bash
docker-compose down
```

### Execute commands in container
```bash
# Run Laravel artisan commands
docker-compose exec backend php artisan migrate:refresh --seed

# Run backend2 Drizzle migrations and seeders
docker-compose exec backend2 npm run db:migrate:run
docker-compose exec backend2 npm run db:seed

# Access backend shell
docker-compose exec backend bash

# Access backend2 shell
docker-compose exec backend2 sh

# Access frontend shell
docker-compose exec frontend sh

# Run npm commands
docker-compose exec frontend npm install
```

### View database
The MySQL container is exposed on `localhost:3306`
- Database: `nglu_db`
- User: `nglu_user`
- Password: `password`

Connect with any MySQL client (Workbench, TablePlus, etc.)

### Reset database
```bash
docker-compose exec backend php artisan migrate:fresh --seed
docker-compose exec backend2 npm run db:migrate:run
docker-compose exec backend2 npm run db:seed
```

## Database Backup
```bash
# Backup
docker-compose exec mysql mysqldump -u nglu_user -ppassword nglu_db > backup.sql

# Restore
docker-compose exec -T mysql mysql -u nglu_user -ppassword nglu_db < backup.sql
```

## Troubleshooting

### Port already in use
If ports are already in use, edit `docker-compose.yml`:
```yaml
ports:
  - "8001:8000"  # Change 8000 to another port like 8001
```

### Database connection issues
Make sure the `mysql` service is running:
```bash
docker-compose ps
```

### Clean rebuild
```bash
docker-compose down -v  # Remove volumes too
docker-compose up -d --build
```

### View container details
```bash
docker-compose ps
docker stats
```

## Environment Variables
Edit these files to customize:
- `backend/.env` - Laravel configuration
- `frontend/.env` - React/Vite configuration

## Development Workflow

1. **Backend code changes** → Automatically reloaded (volume mounted)
2. **Frontend code changes** → Automatically reloaded by Vite HMR
3. **Laravel database changes** → Update migrations and run `docker-compose exec backend php artisan migrate`
4. **Backend2 database changes** → Update Drizzle schema/migrations and run `docker-compose exec backend2 npm run db:migrate:run`

## Production Deployment
For production, you'll want to:
1. Create separate optimized Dockerfiles
2. Use environment-specific configurations
3. Set up proper health checks
4. Configure resource limits
5. Use managed database services

Consult the Docker documentation for best practices.
