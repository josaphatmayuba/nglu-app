#!/bin/sh
set -e

# Only run migrations and seeders once per mounted app volume.
if [ ! -f /app/bootstrap/cache/.docker_initialized ]; then
  echo "[docker-entrypoint] Installing dependencies..."
  composer install --no-interaction --prefer-dist --optimize-autoloader

  echo "[docker-entrypoint] Generating application key..."
  php artisan key:generate --force

  echo "[docker-entrypoint] Running database migrations..."
  php artisan migrate --force

  echo "[docker-entrypoint] Running database seeders..."
  php artisan db:seed --force || true

  touch /app/bootstrap/cache/.docker_initialized
  echo "[docker-entrypoint] Initialization complete."
fi

exec php artisan serve --host=0.0.0.0 --port=8000
