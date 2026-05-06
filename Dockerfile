# ─── Stage 1: deps ───────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

RUN pnpm install --frozen-lockfile --filter @judging/api... --filter @judging/shared

# ─── Stage 2: build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules

COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/api/ ./packages/api/

RUN cd packages/api && npx prisma generate

RUN pnpm --filter @judging/shared build 2>/dev/null || true
RUN pnpm --filter @judging/api build

# ─── Stage 3: runner ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache dumb-init wget

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/packages/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/api/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/packages/api/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared ./packages/shared
COPY --from=builder --chown=nestjs:nodejs /app/packages/api/docker-entrypoint.sh ./docker-entrypoint.sh

RUN mkdir -p /app/uploads && chown nestjs:nodejs /app/uploads

USER nestjs

EXPOSE 3000

RUN chmod +x ./docker-entrypoint.sh

ENTRYPOINT ["dumb-init", "--"]
CMD ["./docker-entrypoint.sh"]
