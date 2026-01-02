#!/bin/bash
# Database initialization script
# This will be run by the backend container after MySQL is ready

set -e

echo "Waiting for MySQL to be ready..."
until mysqladmin ping -h localhost -u "${DB_USER:-root}" -p"${DB_PASS:-password}" --silent; do
  echo "MySQL is unavailable - sleeping"
  sleep 2
done

echo "MySQL is up - initializing database..."

mysql -h localhost -u "${DB_USER:-root}" -p"${DB_PASS:-password}" < /app/server/schema.sql

echo "Database initialization complete!"

