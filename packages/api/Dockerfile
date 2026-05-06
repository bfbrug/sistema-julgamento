# ─── Stage 1: deps ───────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Instala pnpm
RUN npm install -g pnpm@9.15.0

# Copia manifests do monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

# Instala apenas as dependências de produção do workspace de API
RUN pnpm install --frozen-lockfile --filter @judging/api... --filter @judging/shared

# ─── Stage 2: build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9.15.0

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules

COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/api/ ./packages/api/

# Compila shared e depois a API
RUN pnpm --filter @judging/shared build 2>/dev/null || true
RUN pnpm --filter @judging/api build

# Gera o Prisma Client com as binaries corretas para produção (linux/alpine)
RUN cd packages/api && npx prisma generate

# ─── Stage 3: runner (imagem final mínima) ───────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# Instala apenas ferramentas necessárias em runtime
RUN apk add --no-cache dumb-init wget

ENV NODE_ENV=production

# Cria usuário sem privilégios de root
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nestjs

# Copia apenas o necessário da fase builder
COPY --from=builder --chown=nestjs:nodejs /app/packages/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/api/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/packages/api/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/@judging ./node_modules/@judging
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared ./packages/shared

# Pasta de uploads persistente (monte um volume no Railway para uploads)
RUN mkdir -p /app/uploads && chown nestjs:nodejs /app/uploads

USER nestjs

EXPOSE 3000

# Entrypoint: roda migrações e depois inicia o servidor
COPY --chown=nestjs:nodejs packages/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

ENTRYPOINT ["dumb-init", "--"]
CMD ["./docker-entrypoint.sh"]
