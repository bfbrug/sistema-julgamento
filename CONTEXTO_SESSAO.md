# Contexto da Sessão: Deploy Railway

## Estado atual

- **API no ar:** `https://sistema-julgamento-production.up.railway.app/health` → `{status:ok, database:ok, redis:ok}` ✅
- PR #42 aberto (BullMQ usar REDIS_URL com auth) — ainda não mergeado, mas health já passa
- Próximo: criar serviço `web` no Railway

## PRs mergeados nesta sessão (deploy)

- #34: copy prisma/node_modules do builder
- #35: copiar root node_modules do builder (path `@prisma`)
- #36: copiar `.pnpm` store + api node_modules
- #37: runner instala deps fresh (falhou)
- #38: copiar packages/shared inteiro
- #39: prisma generate path + pin versão 6.7.0
- #40: rodar app de `packages/api` dir (resolve symlinks pnpm)
- #41: shared compila CJS, exports apontam pra dist/

## PR aberto

- **#42** (`fix/bullmq-redis-auth`): BullMQ parsea `REDIS_URL` para incluir password. Sem isso, queues spammed `NOAUTH`. Health funciona porque já usa REDIS_URL.

## Configuração final Railway — API

- **Root Directory:** vazio
- **Build Command:** vazio (Dockerfile)
- **Custom Start Command:** vazio (CMD do Dockerfile = `./docker-entrypoint.sh`)
- **Pre-deploy step:** vazio (entrypoint roda migrate)
- **Variáveis Redis:**
  - `REDIS_HOST=${{Redis.REDISHOST}}`
  - `REDIS_PORT=${{Redis.REDISPORT}}`
  - `REDIS_URL=${{Redis.REDIS_URL}}` (com auth — usado pelo health e, após PR #42, pelo BullMQ)
- Domain: `sistema-julgamento-production.up.railway.app`

## Dockerfile final

3 stages: deps (pnpm install) → builder (build shared CJS + api CJS + prisma generate) → runner (pnpm install --prod fresh + copia dist + prisma generate runtime).

Entrypoint faz `cd /app/packages/api` antes de rodar migrate e `node dist/main.js` (necessário pra symlinks pnpm resolverem).

## Lições aprendidas (deploy pnpm workspace + NestJS + Docker)

- pnpm guarda deps em `.pnpm` store, deps do package são symlinks → COPY do Docker não preserva
- Solução: rodar app de dentro do package (cd packages/api) onde symlinks resolvem corretamente
- Shared package: NÃO apontar `main` para `.ts` — Node não roda TS. Compilar CJS pra dist/
- `npx prisma` sem versão = prisma@latest (7.x). SEMPRE pinar: `npx prisma@6.7.0`
- Railway Pre-deploy roda na raiz, não dentro do container — usar entrypoint pra migrate
- Custom Start Command sobrescreve CMD do Dockerfile — deixar vazio se entrypoint funciona

## Próximos passos

1. Mergear PR #42 (BullMQ auth — necessário pra reports/certificates jobs funcionarem)
2. Criar serviço `web` no Railway (Passo 6 do guia)
3. Atualizar `CORS_ORIGIN` na API após web online
4. Rodar seed: `railway run --service api npx prisma db seed`
5. Trocar senha do `admin@example.com`

## Fluxo obrigatório para mudanças

`main` tem branch protection — todo change precisa de PR + CI verde.

```bash
git fetch origin
git checkout -b fix/nome-descritivo origin/main
# editar
git add <arquivo>
git commit -m "fix(escopo): descrição"
git push origin fix/nome-descritivo
gh pr create --base main --head fix/nome-descritivo --title "..." --body "..."
```

**Regras críticas:**
- NUNCA reutilizar branch antiga — sempre `origin/main` como base
- SEMPRE criar PR imediatamente após push
- Conflito: `git fetch origin && git rebase origin/main && git push --force-with-lease`
- NUNCA usar `npx prisma` sem versão — sempre `npx prisma@6.7.0`
