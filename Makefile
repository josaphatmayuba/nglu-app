.PHONY: help up down restart logs bash-backend bash-backend2 bash-frontend migrate migrate-backend2 seed seed-backend2 db-backend2 \
        prod-up prod-down prod-build prod-logs prod-restart \
        dev-up dev-down dev-build dev-logs dev-restart \
        status mem nginx-reload nginx-test

help:
	@echo "NgluERP Docker Commands"
	@echo "======================="
	@echo "make up                    - Start all services"
	@echo "make down                  - Stop all services"
	@echo "make restart               - Restart all services"
	@echo "make logs                  - View all logs"
	@echo "make logs-backend          - View backend logs"
	@echo "make logs-backend2         - View backend2 logs"
	@echo "make logs-frontend         - View frontend logs"
	@echo "make bash-backend          - Access backend container shell"
	@echo "make bash-backend2         - Access backend2 container shell"
	@echo "make bash-frontend         - Access frontend container shell"
	@echo "make migrate               - Run database migrations"
	@echo "make migrate-backend2      - Run backend2 Drizzle migrations"
	@echo "make migrate-fresh         - Reset database and migrate"
	@echo "make seed                  - Run database seeders"
	@echo "make seed-backend2         - Run backend2 seeders"
	@echo "make db-backend2           - Run backend2 migrations and seeders"
	@echo "make build                 - Build Docker images"
	@echo "make clean                 - Remove containers and volumes"
	@echo "make ps                    - Show running containers"

up:
	docker-compose up -d
	@echo "Services started. Check logs with: make logs"

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-backend2:
	docker-compose logs -f backend2

logs-frontend:
	docker-compose logs -f frontend

bash-backend:
	docker-compose exec backend bash

bash-backend2:
	docker-compose exec backend2 sh

bash-frontend:
	docker-compose exec frontend sh

migrate:
	docker-compose exec backend php artisan migrate

migrate-backend2:
	docker-compose exec backend2 npm run db:migrate:run

migrate-fresh:
	docker-compose exec backend php artisan migrate:fresh --seed

seed:
	docker-compose exec backend php artisan db:seed

seed-backend2:
	docker-compose exec backend2 npm run db:seed

db-backend2:
	docker-compose exec backend2 npm run db:migrate:run
	docker-compose exec backend2 npm run db:seed

build:
	docker-compose build

clean:
	docker-compose down -v

ps:
	docker-compose ps

npm-install:
	docker-compose exec frontend npm install

npm-update:
	docker-compose exec frontend npm update

composer-install:
	docker-compose exec backend composer install

composer-update:
	docker-compose exec backend composer update

# ════════════════════════════════════════════════════════════════════
# Server-side commands (run on admin@16.54.167.125 Lightsail)
# ════════════════════════════════════════════════════════════════════

# ─── Production (ongdngolu.org) ─────────────────────────────
prod-up:
	cd /opt/nglu-app && docker compose -p nglu_prod -f docker-compose.prod.yml --env-file .env.prod up -d

prod-down:
	cd /opt/nglu-app && docker compose -p nglu_prod -f docker-compose.prod.yml down

prod-build:
	cd /opt/nglu-app && docker compose -p nglu_prod -f docker-compose.prod.yml --env-file .env.prod up -d --build

prod-logs:
	docker logs -f nglu_prod_backend2

prod-restart:
	cd /opt/nglu-app && docker compose -p nglu_prod -f docker-compose.prod.yml --env-file .env.prod restart

# ─── Development (dev.ongdngolu.org) ────────────────────────
dev-up:
	cd /opt/nglu-app-dev && docker compose -p nglu_dev -f docker-compose.dev.yml --env-file .env.dev up -d

dev-down:
	cd /opt/nglu-app-dev && docker compose -p nglu_dev -f docker-compose.dev.yml down

dev-build:
	cd /opt/nglu-app-dev && docker compose -p nglu_dev -f docker-compose.dev.yml --env-file .env.dev up -d --build

dev-logs:
	docker logs -f nglu_dev_backend2

dev-restart:
	cd /opt/nglu-app-dev && docker compose -p nglu_dev -f docker-compose.dev.yml --env-file .env.dev restart

# ─── Utilities ──────────────────────────────────────────────
status:
	docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

mem:
	@echo "=== System memory ==="
	@free -h
	@echo ""
	@echo "=== Container memory ==="
	@docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}'

nginx-reload:
	docker exec nglu_prod_frontend nginx -t && docker exec nglu_prod_frontend nginx -s reload

nginx-test:
	docker exec nglu_prod_frontend nginx -t
