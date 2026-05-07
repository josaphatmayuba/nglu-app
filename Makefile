.PHONY: help up down restart logs bash-backend bash-frontend migrate seed

help:
	@echo "NgluERP Docker Commands"
	@echo "======================="
	@echo "make up                    - Start all services"
	@echo "make down                  - Stop all services"
	@echo "make restart               - Restart all services"
	@echo "make logs                  - View all logs"
	@echo "make logs-backend          - View backend logs"
	@echo "make logs-frontend         - View frontend logs"
	@echo "make bash-backend          - Access backend container shell"
	@echo "make bash-frontend         - Access frontend container shell"
	@echo "make migrate               - Run database migrations"
	@echo "make migrate-fresh         - Reset database and migrate"
	@echo "make seed                  - Run database seeders"
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

logs-frontend:
	docker-compose logs -f frontend

bash-backend:
	docker-compose exec backend bash

bash-frontend:
	docker-compose exec frontend sh

migrate:
	docker-compose exec backend php artisan migrate

migrate-fresh:
	docker-compose exec backend php artisan migrate:fresh --seed

seed:
	docker-compose exec backend php artisan db:seed

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
