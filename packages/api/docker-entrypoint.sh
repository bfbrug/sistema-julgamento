#!/bin/sh
set -e

echo "▶ Rodando migrações do banco de dados..."
npx prisma migrate deploy

echo "▶ Iniciando servidor NestJS..."
exec node dist/main.js
