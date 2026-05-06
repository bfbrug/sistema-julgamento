#!/bin/sh
set -e

cd /app/packages/api

echo "▶ Rodando migrações do banco de dados..."
npx prisma@6.7.0 migrate deploy --schema ./prisma/schema.prisma

echo "▶ Iniciando servidor NestJS..."
exec node dist/main.js
