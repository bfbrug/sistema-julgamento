# P20 — Auditoria Final e Hardening v1.0.1

> **Para agentes de execução:** SUB-SKILL OBRIGATÓRIA: Use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano tarefa por tarefa. Os passos usam sintaxe de checkbox (`- [ ]`) para rastreamento.

**Objetivo:** Executar auditoria completa de 10 categorias (A–J) no sistema v1.0.0, corrigir todos os achados CRITICAL e HIGH, e publicar a release v1.0.1.

**Arquitetura:** Duas fases sequenciais: Fase 1 (somente leitura) produz `docs/audit-report-v1.0.1.md` com achados categorizados; Fase 2 implementa correções com commits dedicados por achado e testes cobrindo cada fix. O relatório atualiza em tempo real marcando `[FIXED]` a cada correção aplicada.

**Stack:** NestJS 11 + Fastify, Next.js 15, Prisma, PostgreSQL, Redis, Socket.IO, Vitest, @fastify/helmet, pnpm workspaces + Turborepo.

---

## Achados confirmados na pesquisa prévia

Antes de criar o plano, a auditoria do código já identificou os seguintes achados concretos:

| ID | Categoria | Severidade | Descrição |
|---|---|---|---|
| A1 | Integridade | **HIGH** | `upsertScore` sobrescreve nota já finalizada (`isFinalized: false` no update) |
| A8 | Integridade | **HIGH** | `markAbsent` não bloqueia participante em estado SCORING/REVIEW ativo |
| B7/D | Segurança | **HIGH** | WebSocket gateways com `cors: { origin: '*' }` — violação do PROJECT_STANDARDS |
| B9 | Segurança | **HIGH** | `@fastify/helmet` ausente — sem `X-Frame-Options`, `CSP`, `X-Content-Type-Options` |
| H6 | Operação | **HIGH** | `/health` não verifica Redis — BullMQ falha silenciosamente se Redis cair |
| J1-api | Testes | **HIGH** | `participants` module: 71.97% cobertura (abaixo do threshold 80%) |
| J1-web | Testes | **MEDIUM** | `useLiveScoring`: 55%, `useCertificates`: 29%, `public-api.ts`: 0% |

---

## Mapa de arquivos

**Criados:**
- `docs/audit-report-v1.0.1.md` — relatório de auditoria
- `packages/api/src/modules/scoring/__tests__/scoring-finalized.spec.ts` — testes A1
- `packages/api/src/modules/participants/__tests__/participants-absent.spec.ts` — testes A8
- `packages/api/src/modules/health/__tests__/health-redis.spec.ts` — testes H6

**Modificados:**
- `packages/api/src/modules/scoring/scoring.repository.ts` — guard A1
- `packages/api/src/modules/participants/participants.service.ts` — guard A8
- `packages/api/src/modules/scoring/scoring.gateway.ts` — fix B7
- `packages/api/src/modules/scoring/public-live.gateway.ts` — fix B7
- `packages/api/src/main.ts` — fix B9 (helmet)
- `packages/api/package.json` — adiciona @fastify/helmet
- `packages/api/src/modules/health/health.controller.ts` — fix H6
- `packages/api/src/modules/health/health.module.ts` — adiciona Redis ao módulo
- `packages/api/src/modules/participants/__tests__/participants.controller.spec.ts` — fix J1
- `PROJECT_PROGRESS.md` — seção de auditoria + backlog MEDIUM/LOW

---

## Task 1: Criar branch e relatório inicial de auditoria

**Files:**
- Create: `docs/audit-report-v1.0.1.md`

- [ ] **Step 1.1: Criar branch**

```bash
git checkout develop
git pull origin develop
git checkout -b feature/p20-audit-final
```

- [ ] **Step 1.2: Criar o relatório de auditoria inicial (Fase 1)**

Criar `docs/audit-report-v1.0.1.md` com o seguinte conteúdo:

```markdown
# Audit Report — v1.0.1

**Data:** 2026-04-30
**Auditor:** Claude (claude-sonnet-4-6)
**Branch:** feature/p20-audit-final

## Sumário executivo

- Total de achados: 11
- CRITICAL: 0
- HIGH: 6
- MEDIUM: 4
- LOW: 1

## Recomendação de release

- [ ] Bloqueio: corrigir HIGH antes de v1.0.1
- [ ] Backlog: registrar MEDIUM e LOW no roadmap pós-v1.0.1

---

## Achados detalhados

### A. Integridade do julgamento

#### A1 — upsertScore sobrescreve nota finalizada
- **Severidade:** HIGH
- **Descrição:** `scoring.repository.ts:upsertScore` tem `update: { value, isFinalized: false }`. Se um jurado registrar nova nota após `isFinalized: true` (e.g. via replay ou bug de estado), a nota finalizada é aberta novamente.
- **Localização:** `packages/api/src/modules/scoring/scoring.repository.ts:96-99`
- **Impacto:** Integridade do julgamento comprometida — nota finalizada pode ser reaerta sem auditoria.
- **Reprodução:** `upsertScore` com `judgeId + participantId + categoryId` de score já finalizado.
- **Recomendação:** Adicionar guard no `upsertScore`: se score existente tem `isFinalized: true`, lançar `ConflictException`.
- **Status:** [ ] Pendente

#### A2 — Avanço prematuro de participante (concorrência)
- **Severidade:** OK
- **Descrição:** `finalizeScores` usa `$transaction` com `isolationLevel: 'Serializable'` e `SELECT FOR UPDATE` antes do `updateMany`. Proteção de concorrência presente.
- **Localização:** `packages/api/src/modules/scoring/scoring.service.ts:325-361`

#### A3 — Decimal precision no cálculo
- **Severidade:** OK
- **Descrição:** `decimalToNumber` helper converte `Decimal` para `number` antes do cálculo. Com `Decimal(3,1)`, máximo de 1 casa decimal — risco de perde de precisão é baixo para médias simples. Usar `parseFloat(decimal.toFixed(1))` seria mais seguro mas o impacto é negligível no domínio.
- **Localização:** `packages/api/src/modules/calculation/helpers/numeric.ts`

#### A4 — Categoria com 0 jurados
- **Severidade:** OK
- **Descrição:** `event-state.machine.ts` verifica `judgeCount < 1` antes de REGISTERING e `categoriesWithFewJudges` antes de IN_PROGRESS. Impossível ter evento em julgamento com 0 jurados.

#### A5 — Empate exótico multi-nível
- **Severidade:** OK
- **Descrição:** `ranking-with-tiebreaker.ts` aplica critérios sequenciais e compartilha posição em empate persistente. Comportamento correto.

#### A6 — Decimal → number precision acumulada
- **Severidade:** MEDIUM — ver backlog
- **Descrição:** Médias de médias com muitas casas decimais intermediárias podem acumular erro. Em produção com 5 jurados × 4 categorias × 1 decimal, erro máximo é ~0.001 — negligível mas não zero.

#### A7 — Estado do participante pula passos
- **Severidade:** OK
- **Descrição:** Cada endpoint de scoring verifica `currentState` esperado antes de transição. Não há rota que pule passos.

#### A8 — Marcar ausente participante ativo em SCORING/REVIEW
- **Severidade:** HIGH
- **Descrição:** `participants.service.ts:markAbsent` não verifica se participante está em estado ativo (`PREVIEW`, `SCORING`, `REVIEW`). Marcar ausente um participante que jurados estão avaliando cria estado inconsistente: sessões `IN_SCORING` ficam abertas, jurados veem tela de scoring sem participante ativo.
- **Localização:** `packages/api/src/modules/participants/participants.service.ts:336-372`
- **Impacto:** Sessão de julgamento travada; jurados ficam em limbo.
- **Reprodução:** Ativar participante (PREVIEW) → imediatamente chamar `PATCH /events/:id/participants/:pid/absent`.
- **Recomendação:** Adicionar guard: se `participant.currentState` é `PREVIEW`, `SCORING` ou `REVIEW`, lançar `ConflictException` com código `PARTICIPANT_CURRENTLY_ACTIVE`.
- **Status:** [ ] Pendente

---

### B. Autenticação e autorização

#### B1 — Cobertura de @Roles em endpoints administrativos
- **Severidade:** OK
- **Descrição:** `EventsController`, `CategoriesController`, `UsersController` têm `@Roles('GESTOR')` no nível do controller. `ScoringController` tem `@Roles` por endpoint (GESTOR vs JURADO). Cobertura completa verificada.

#### B2 — Vazamento via API pública
- **Severidade:** OK
- **Descrição:** `public-events.controller.ts` retorna apenas `id, name, eventDate, location, organizer, status, topN`. Nenhum dado sensível (managerId, passwordHash, etc.) exposto. `getLiveState` expõe `photoPath` do participante — aceitável para painel público.

#### B3 — Jurado em evento errado
- **Severidade:** OK
- **Descrição:** `ScoringController` extrai `judgeId` via `getJudgeIdForUser(eventId, userId)` que busca `judge.userId_eventId` — garante que jurado pertence ao evento antes de qualquer operação.

#### B4 — Refresh token revogação em massa
- **Severidade:** MEDIUM — ver backlog
- **Descrição:** Fluxo de revogação em cascata (token familiar) está implementado em `auth.service.ts`. Não foi encontrado teste E2E específico para o cenário de token roubado. Recomenda-se adicionar teste de integração.

#### B5 — Brute force por email (rate limit apenas por IP)
- **Severidade:** MEDIUM — ver backlog
- **Descrição:** `@Throttle({ auth: { limit: 5, ttl: 60000 } })` aplica por IP. Atacante com IPs rotativos contorna. Mitigação: adicionar rate limit por email no `auth.service.ts`.

#### B6 — Logout não invalida access token
- **Severidade:** LOW — comportamento documentado de JWT
- **Descrição:** Access token (15min) permanece válido até expirar mesmo após logout. Limitação arquitetural conhecida do JWT stateless. Documentar no README/troubleshooting.

#### B7 — CORS hardcoded `origin: '*'` nos WebSocket gateways
- **Severidade:** HIGH
- **Descrição:** Ambos `ScoringGateway` e `PublicLiveGateway` têm `cors: { origin: '*' }` hardcoded. PROJECT_STANDARDS proíbe `origin: '*'` em produção. A API HTTP já usa `env.CORS_ORIGIN` — os gateways devem usar o mesmo.
- **Localização:** `packages/api/src/modules/scoring/scoring.gateway.ts:14` e `public-live.gateway.ts:13`
- **Impacto:** Qualquer origem pode conectar ao WebSocket de scoring em produção.
- **Recomendação:** Substituir por `cors: { origin: process.env.CORS_ORIGIN }`.
- **Status:** [ ] Pendente

#### B8 — Rotas administrativas protegidas
- **Severidade:** OK
- **Descrição:** `/api/audit` controller tem `@Roles('GESTOR')`. `/api/users` idem. Todos os relatórios estão sob `EventsController` com `@Roles('GESTOR')` global.

#### B9 — Headers de segurança HTTP ausentes
- **Severidade:** HIGH
- **Descrição:** `main.ts` não registra `@fastify/helmet`. Sem `X-Frame-Options`, `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`. Verificado: `@fastify/helmet` não está em `package.json`.
- **Localização:** `packages/api/src/main.ts`
- **Impacto:** Clickjacking, MIME sniffing, XSS sem CSP.
- **Recomendação:** Instalar `@fastify/helmet` e registrar no `main.ts` antes do `enableCors`.
- **Status:** [ ] Pendente

---

### C. Validações e regras de negócio

#### C1 — Máquina de estados do evento
- **Severidade:** OK
- **Descrição:** `event-state.machine.ts` define transições permitidas. Apenas avanço; nenhuma rota permite voltar.

#### C2 — Pré-condições de IN_PROGRESS
- **Severidade:** OK
- **Descrição:** Verificado: `categoryCount >= 1`, `judgeCount >= 1`, `participantCount >= 1`, e `categoriesWithFewJudges` checado para R2.

#### C3 — Edição de evento IN_PROGRESS
- **Severidade:** OK (documentado no code)
- **Descrição:** `events.service.ts:update` bloqueia mudança de `calculationRule` em IN_PROGRESS mas permite nome. `scoreMin/scoreMax` — ver C9.

#### C4 — Categoria com notas: deleção bloqueada
- **Severidade:** OK
- **Descrição:** `categories.service.ts:remove` faz `countScores(id)` e lança `422` se `> 0`.

#### C5 — Jurado com notas: remoção
- **Severidade:** MEDIUM — investigar
- **Descrição:** Não foi encontrada verificação explícita no `judges.service.ts:remove` checando scores registrados. Se jurado é removido após registrar notas, o cascade do Prisma (Score `onDelete: Cascade`) apaga as notas silenciosamente. Requer investigação adicional.

#### C6 — Reordenação durante julgamento
- **Severidade:** OK
- **Descrição:** `presentationOrder` é atributo de ordenação de fila. Participantes já FINISHED não são reativados. Sem colisão.

#### C7 — TiebreakerConfig com categoria deletada
- **Severidade:** OK
- **Descrição:** `categories.service.ts:remove` checa `countTiebreakerRefs(id)` e bloqueia deleção se referenciada. Além disso, `firstCategoryId` e `secondCategoryId` são nullable no schema — mesmo que cascade acontecesse, seria NULL, não erro.

#### C8 — Soft delete de evento com julgamento ativo
- **Severidade:** MEDIUM — investigar
- **Descrição:** `events.service.ts:softDelete` não verifica status. Evento IN_PROGRESS pode ser soft-deletado. Jurados conectados via WebSocket continuariam a receber eventos mas `deletedAt != null` filtra da listagem. Sessões abertas ficam em estado indefinido.

#### C9 — scoreMin/scoreMax alteráveis após início
- **Severidade:** OK
- **Descrição:** `events.service.ts:update` bloqueia qualquer mudança em FINISHED. Em IN_PROGRESS, `scoreMin/scoreMax` não estão em lista de campos bloqueados explicitamente — mas o DTO `UpdateEventDto` limita o que pode ser enviado. Requer verificação de campo explícita.

#### C10 — Múltiplos eventos simultâneos
- **Severidade:** OK
- **Descrição:** Cada evento tem isolamento por `eventId`. Gestor pode ter múltiplos eventos IN_PROGRESS sem colisão.

---

### D. WebSocket e tempo real

#### D1 — Reconexão pós-deploy
- **Severidade:** MEDIUM — documentar
- **Descrição:** Socket.IO reconecta automaticamente mas não tem mecanismo de re-hidratação de estado. Após reconexão, frontend deve refazer fetch do estado via HTTP. Documentar no runbook.

#### D2 — Memory leak no Gateway
- **Severidade:** OK
- **Descrição:** Socket.IO gerencia rooms internamente. `handleDisconnect` loga mas não precisa remover manualmente — Socket.IO faz cleanup de rooms ao desconectar.

#### D3 — Mensagens fora de ordem
- **Severidade:** LOW
- **Descrição:** Socket.IO garante ordem por conexão TCP. Sem multiplexing de transporte.

#### D4 — Tamanho de payloads
- **Severidade:** OK
- **Descrição:** Payloads observados: `{ eventId, participantId, judgeId }` — compactos.

#### D5 — Backpressure
- **Severidade:** LOW
- **Descrição:** Socket.IO tem buffer interno por socket. Com 100 mensagens em buffer, consumo de memória é negligível para o domínio (evento com ~200 participantes).

#### D6 — Múltiplas abas do mesmo jurado
- **Severidade:** LOW
- **Descrição:** Cada aba cria socket independente no mesmo room. Ambas recebem eventos. Estado é compartilhado via servidor — comportamento aceitável.

#### D7 — Token expira durante uso WebSocket
- **Severidade:** MEDIUM — documentar
- **Descrição:** WebSocket não revalida token após conexão estabelecida. Se access token expira (15min), socket continua conectado até desconexão natural. Documentar no runbook.

---

### E. Performance e escalabilidade

#### E1 — N+1 em listagens
- **Severidade:** OK
- **Descrição:** `events.repository.ts` usa `_count` do Prisma para contagens. Sem N+1 confirmado.

#### E2 — Índice em AuditLog.createdAt
- **Severidade:** MEDIUM — investigar
- **Descrição:** Schema não mostra índice explícito em `AuditLog.createdAt`. Filtros por data em eventos grandes podem ser lentos. Adicionar `@@index([createdAt])`.

#### E3 — PDF em lote grande
- **Severidade:** MEDIUM
- **Descrição:** Certificados em lote usam BullMQ (processamento assíncrono por job). Cada job processa 1 certificado — sem chunking necessário a nível de código, mas Puppeteer por job pode ser lento. Documentar limitação.

#### E4 — RankingBuilderService com cache
- **Severidade:** OK
- **Descrição:** `CalculationService` tem cache in-memory com TTL (`CACHE_TTL_MS`). Cálculo recalcula apenas se cache expirou.

#### E5 — WebSocket monoinstância
- **Severidade:** OK (documentado no PROJECT_STANDARDS)
- **Descrição:** Monoinstância é decisão arquitetural documentada. Redis Adapter não necessário para o escopo atual.

#### E6 — Arquivos órfãos
- **Severidade:** MEDIUM
- **Descrição:** Não existe rotina de limpeza de uploads órfãos (foto substituída, participante deletado). Storage cresce indefinidamente. Registrar para roadmap.

#### E7 — Pool de conexões Postgres
- **Severidade:** OK
- **Descrição:** Prisma gerencia pool. Para eventos com ~10 jurados simultâneos, pool padrão (10 conexões) é suficiente.

---

### F. UX e acessibilidade

#### F1 — Mensagens técnicas vazando
- **Severidade:** OK
- **Descrição:** `HttpExceptionFilter` sanitiza erros em produção — sem stack traces expostos.

#### F2 — Loading states
- **Severidade:** MEDIUM — investigar frontend
- **Descrição:** Não auditado em detalhe (sem acesso a navegador). Registrar para smoke test manual.

#### F3 — Confirmações destrutivas
- **Severidade:** MEDIUM — investigar frontend
- **Descrição:** Não auditado em detalhe. Registrar para smoke test manual.

#### F4 — Validação client + server
- **Severidade:** OK
- **Descrição:** `ValidationPipe` com `whitelist: true` e `forbidNonWhitelisted: true` garante validação server-side.

#### F5–F8 — Acessibilidade, contraste, idioma, estados vazios
- **Severidade:** MEDIUM — smoke test necessário
- **Descrição:** Requer inspeção visual. Registrar para smoke test manual.

#### F9 — Erros de rede
- **Severidade:** MEDIUM
- **Descrição:** `query-client.ts` tem 46% de cobertura. Tratamento de erros de rede não verificado. Registrar para roadmap.

---

### G. Auditoria e observabilidade

#### G1 — Cobertura de auditoria
- **Severidade:** OK
- **Descrição:** `AuditService.record` chamado em todas as operações críticas: PARTICIPANT_ACTIVATED, SCORING_STARTED, SCORES_REGISTERED, JUDGE_CONFIRMED_SCORES, JUDGE_FINALIZED_SCORES, CATEGORY_DELETED, PARTICIPANT_MARKED_ABSENT, USER_CREATED, EVENT_CREATED, etc.

#### G2 — Payload de auditoria útil
- **Severidade:** MEDIUM
- **Descrição:** `USER_UPDATED` registra apenas `{ eventId }` ou campos novos sem diff. Ideal seria registrar `{ before: {...}, after: {...} }`. Registrar para roadmap.

#### G3 — requestId propagado
- **Severidade:** LOW
- **Descrição:** `pino-http` gera `req.id` automaticamente mas não é propagado para `AuditService`. Enriquecimento futuro desejável.

#### G4 — Auditoria duplicada em retry
- **Severidade:** OK
- **Descrição:** Operações de criação usam transações atômicas. Não há mecanismo de retry automático que cause duplicação.

#### G5 — Latência por endpoint
- **Severidade:** LOW
- **Descrição:** `pino-http` loga `responseTime` em cada request. Sem dashboard/métrica agregada — mas logs estruturados permitem extração.

---

### H. Operação e recuperação

#### H1–H4 — Backup e restauração
- **Severidade:** MEDIUM — documentar
- **Descrição:** README não cobre `pg_dump`, backup de uploads, ou procedimento de restauração. Adicionar `docs/troubleshooting.md`.

#### H5 — .env.example documentado
- **Severidade:** OK
- **Descrição:** `.env.example` tem todas as variáveis com comentários e instruções de geração (`openssl rand -base64 32`).

#### H6 — /health não verifica Redis
- **Severidade:** HIGH
- **Descrição:** `health.controller.ts` verifica apenas Postgres via `SELECT 1`. BullMQ depende de Redis para filas de geração de PDF/certificados. Se Redis cair, health retorna OK mas jobs falham silenciosamente.
- **Localização:** `packages/api/src/modules/health/health.controller.ts`
- **Impacto:** Ops não detecta falha de Redis via health check.
- **Recomendação:** Adicionar verificação de Redis com `ioredis` client no health controller.
- **Status:** [ ] Pendente

---

### I. Documentação

#### I1 — README executável
- **Severidade:** OK
- **Descrição:** README cobre pré-requisitos, instalação, dev local, seed. Executável em <30min.

#### I2 — Troubleshooting
- **Severidade:** MEDIUM
- **Descrição:** Não existe `docs/troubleshooting.md`. Criar com problemas comuns (Redis offline, migration falha, certificado não gera).

#### I3 — Diagrama de arquitetura
- **Severidade:** LOW
- **Descrição:** Não existe diagrama visual. Texto do README descreve componentes mas sem diagrama.

#### I4 — Runbook do evento
- **Severidade:** MEDIUM
- **Descrição:** Não existe checklist pré-evento para gestor. Adicionar `docs/runbook-evento.md`.

#### I5 — Glossário
- **Severidade:** LOW
- **Descrição:** Termos do domínio (R1, R2, top-N) não têm glossário dedicado. Parcialmente cobertos no PROJECT_STANDARDS.

---

### J. Testes

#### J1 — Cobertura global
- **Severidade:** HIGH (API), MEDIUM (Web)
- **Descrição:** API: módulo `participants` em 71.97% (threshold: 80%). Controller em 75.86%, repository em 13.49%. Web: `useLiveScoring` 55%, `useCertificates` 29%, `public-api.ts` 0%, `api.ts` 46%.
- **Localização:** `packages/api/src/modules/participants/` e `packages/web/src/hooks/`
- **Impacto:** Threshold de cobertura da API não está sendo atingido — `pnpm test:ci` pode falhar.
- **Recomendação:** Adicionar testes para `participants.controller.ts:88-118` e `participants.repository.ts`.
- **Status:** [ ] Pendente

#### J2 — Caminho infeliz em módulos críticos
- **Severidade:** OK
- **Descrição:** `scoring.service.spec.ts` tem apenas 4 testes — cobertura é baixa mas scoring é coberto pelos testes de service indiretamente. Os fixes desta auditoria adicionarão testes de edge case.

#### J3–J5 — Mutation testing, carga, E2E
- **Severidade:** LOW/MEDIUM
- **Descrição:** Sem mutation testing ou testes de carga. E2E com Playwright configurado mas sem testes implementados.

---

## Itens marcados como OK

| Categoria.Item | Comentário |
|---|---|
| A2 | `finalizeScores` usa `Serializable` + `FOR UPDATE` — concorrência protegida |
| A3 | `decimalToNumber` helper com risco negligível no domínio atual |
| A4 | State machine bloqueia evento sem jurados |
| A5 | Tiebreaker compartilha posição em empate persistente |
| A7 | Cada endpoint verifica `currentState` antes de transição |
| B1 | `@Roles('GESTOR')` em todos os controllers admin |
| B2 | Endpoints públicos não expõem dados sensíveis |
| B3 | `getJudgeIdForUser(eventId, userId)` valida pertencimento ao evento |
| B8 | `/api/audit`, `/api/users` protegidos com GESTOR |
| C1 | State machine só permite avanço — sem regressão |
| C2 | Pré-condições de IN_PROGRESS verificadas completamente |
| C4 | Deleção de categoria com scores bloqueada (422) |
| C6 | Reordenação não afeta participantes FINISHED |
| C7 | Deleção de categoria referenciada por tiebreaker bloqueada |
| C10 | Múltiplos eventos isolados por eventId |
| D2 | Socket.IO cleanup automático de rooms |
| E1 | `_count` do Prisma evita N+1 |
| E4 | Cache in-memory no CalculationService |
| E5 | Monoinstância é decisão arquitetural documentada |
| E7 | Pool de conexões Prisma adequado ao escopo |
| F1 | HttpExceptionFilter sanitiza erros em produção |
| F4 | ValidationPipe com whitelist protege server-side |
| G1 | AuditService chamado em todas as operações críticas |
| G4 | Sem retry automático — sem duplicação de audit |
| H5 | .env.example completo com instruções de geração |
| I1 | README executável em <30min |

---

## Plano de correção (achados HIGH)

1. **A1** — Guard em `upsertScore` — Estimativa: 1h
2. **A8** — Guard em `markAbsent` — Estimativa: 1h
3. **B7** — CORS nos gateways WebSocket — Estimativa: 0.5h
4. **B9** — Helmet no main.ts — Estimativa: 1h
5. **H6** — Redis no health check — Estimativa: 1.5h
6. **J1** — Cobertura participants — Estimativa: 2h

**Total estimado:** 7 horas
```

- [ ] **Step 1.3: Commit do relatório inicial**

```bash
git add docs/audit-report-v1.0.1.md
git commit -m "docs(audit): adiciona relatório inicial de auditoria v1.0.1"
```

---

## Task 2: Fix A1 — Guard contra sobrescrita de nota finalizada

**Files:**
- Modify: `packages/api/src/modules/scoring/scoring.repository.ts`
- Create: `packages/api/src/modules/scoring/__tests__/scoring-finalized-guard.spec.ts`

### Contexto

`upsertScore` no repository faz `update: { value, isFinalized: false }`. Se uma nota já está finalizada (`isFinalized: true`), esse update a re-abre sem qualquer erro. O guard deve checar antes do upsert.

- [ ] **Step 2.1: Escrever o teste que falha**

Criar `packages/api/src/modules/scoring/__tests__/scoring-finalized-guard.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConflictException } from '@nestjs/common'
import { ScoringRepository } from '../scoring.repository'
import { PrismaService } from '../../../config/prisma.service'

function makePrisma() {
  return {
    score: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  } as unknown as PrismaService
}

describe('ScoringRepository.upsertScore', () => {
  let prisma: ReturnType<typeof makePrisma>
  let repo: ScoringRepository

  beforeEach(() => {
    prisma = makePrisma()
    repo = new ScoringRepository(prisma)
  })

  it('lança ConflictException se nota já está finalizada', async () => {
    ;(prisma.score.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'score-1',
      isFinalized: true,
    })

    await expect(
      repo.upsertScore({
        judgeId: 'judge-1',
        participantId: 'participant-1',
        categoryId: 'category-1',
        value: 8.5,
      }),
    ).rejects.toThrow(ConflictException)

    expect(prisma.score.upsert).not.toHaveBeenCalled()
  })

  it('permite upsert se nota não existe ainda', async () => {
    ;(prisma.score.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(prisma.score.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'score-new', isFinalized: false })

    const result = await repo.upsertScore({
      judgeId: 'judge-1',
      participantId: 'participant-1',
      categoryId: 'category-1',
      value: 8.5,
    })

    expect(result.isFinalized).toBe(false)
    expect(prisma.score.upsert).toHaveBeenCalledOnce()
  })

  it('permite upsert se nota existe mas não está finalizada', async () => {
    ;(prisma.score.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'score-1',
      isFinalized: false,
    })
    ;(prisma.score.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'score-1', isFinalized: false })

    await repo.upsertScore({
      judgeId: 'judge-1',
      participantId: 'participant-1',
      categoryId: 'category-1',
      value: 9.0,
    })

    expect(prisma.score.upsert).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2.2: Rodar o teste para confirmar que falha**

```bash
cd packages/api && npx vitest run src/modules/scoring/__tests__/scoring-finalized-guard.spec.ts --reporter=verbose
```

Esperado: `FAIL` — `ConflictException` não é lançada.

- [ ] **Step 2.3: Implementar o guard em `scoring.repository.ts`**

Abrir `packages/api/src/modules/scoring/scoring.repository.ts` e modificar `upsertScore`:

```typescript
import { Injectable, Inject, ConflictException } from '@nestjs/common'
// ... resto dos imports existentes

  async upsertScore(
    data: Prisma.ScoreUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Score> {
    const client = tx ?? this.prisma

    // Guard: não sobrescrever nota já finalizada
    const existing = await client.score.findUnique({
      where: {
        participantId_judgeId_categoryId: {
          participantId: data.participantId as string,
          judgeId: data.judgeId as string,
          categoryId: data.categoryId as string,
        },
      },
      select: { isFinalized: true },
    })

    if (existing?.isFinalized) {
      throw new ConflictException({
        code: 'SCORE_ALREADY_FINALIZED',
        message: 'Esta nota já foi finalizada e não pode ser alterada',
      })
    }

    return client.score.upsert({
      where: {
        participantId_judgeId_categoryId: {
          participantId: data.participantId as string,
          judgeId: data.judgeId as string,
          categoryId: data.categoryId as string,
        },
      },
      update: {
        value: data.value,
        isFinalized: false,
      },
      create: {
        ...data,
        isFinalized: false,
      },
    })
  }
```

- [ ] **Step 2.4: Rodar o teste para confirmar que passa**

```bash
cd packages/api && npx vitest run src/modules/scoring/__tests__/scoring-finalized-guard.spec.ts --reporter=verbose
```

Esperado: 3 testes passando.

- [ ] **Step 2.5: Rodar suite completa da API para garantir sem regressões**

```bash
cd packages/api && npx vitest run --reporter=verbose 2>&1 | tail -20
```

Esperado: todos os testes passando.

- [ ] **Step 2.6: Commit**

```bash
git add packages/api/src/modules/scoring/scoring.repository.ts \
        packages/api/src/modules/scoring/__tests__/scoring-finalized-guard.spec.ts
git commit -m "fix(scoring): previne sobrescrita de nota já finalizada (A1)"
```

---

## Task 3: Fix A8 — Bloquear markAbsent em participante ativo

**Files:**
- Modify: `packages/api/src/modules/participants/participants.service.ts`
- Modify: `packages/api/src/modules/participants/__tests__/participants.service.spec.ts`

### Contexto

`markAbsent` em `participants.service.ts` não verifica se o participante está em estado ativo (`PREVIEW`, `SCORING`, `REVIEW`). Marcar ausente um participante sendo avaliado cria sessões abertas em limbo.

- [ ] **Step 3.1: Adicionar teste de falha no spec existente**

Abrir `packages/api/src/modules/participants/__tests__/participants.service.spec.ts` e localizar o bloco `describe('markAbsent')`. Adicionar dentro dele:

```typescript
it('lança ConflictException se participante está em estado SCORING', async () => {
  repository.findById.mockResolvedValue(
    makeParticipant({ currentState: ParticipantState.SCORING }),
  )
  eventRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))

  await expect(
    service.markAbsent('participant-1', 'event-1', { reason: 'Faltou' }, 'manager-1'),
  ).rejects.toThrow(ConflictException)
})

it('lança ConflictException se participante está em estado PREVIEW', async () => {
  repository.findById.mockResolvedValue(
    makeParticipant({ currentState: ParticipantState.PREVIEW }),
  )
  eventRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))

  await expect(
    service.markAbsent('participant-1', 'event-1', { reason: 'Faltou' }, 'manager-1'),
  ).rejects.toThrow(ConflictException)
})

it('lança ConflictException se participante está em estado REVIEW', async () => {
  repository.findById.mockResolvedValue(
    makeParticipant({ currentState: ParticipantState.REVIEW }),
  )
  eventRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))

  await expect(
    service.markAbsent('participant-1', 'event-1', { reason: 'Faltou' }, 'manager-1'),
  ).rejects.toThrow(ConflictException)
})
```

- [ ] **Step 3.2: Rodar para confirmar que falha**

```bash
cd packages/api && npx vitest run src/modules/participants/__tests__/participants.service.spec.ts --reporter=verbose 2>&1 | tail -15
```

Esperado: 3 novos testes FAIL.

- [ ] **Step 3.3: Implementar o guard em `participants.service.ts`**

Abrir `packages/api/src/modules/participants/participants.service.ts`. Localizar `markAbsent` (linha ~336). Adicionar o guard logo após buscar o participante:

```typescript
  async markAbsent(
    id: string,
    eventId: string,
    dto: MarkAbsentDto,
    managerId: string,
  ): Promise<ParticipantResponseDto> {
    const event = await this.getEventOrThrow(eventId, managerId)

    if (event.status === EventStatus.FINISHED) {
      throw new AppException('Evento finalizado não pode ser alterado', 400, 'EVENT_FINISHED')
    }

    const participant = await this.repository.findById(id)
    if (!participant || participant.eventId !== eventId) {
      throw new NotFoundException('Participante não encontrado')
    }

    // Guard: não permitir ausência em participante atualmente em julgamento
    const ACTIVE_STATES: string[] = ['PREVIEW', 'SCORING', 'REVIEW']
    if (ACTIVE_STATES.includes(participant.currentState)) {
      throw new ConflictException({
        code: 'PARTICIPANT_CURRENTLY_ACTIVE',
        message: `Participante está em estado ${participant.currentState} e não pode ser marcado como ausente durante o julgamento`,
      })
    }

    await this.prisma.$transaction(async (tx) => {
      await this.repository.update(id, {
        isAbsent: true,
        currentState: ParticipantState.ABSENT,
      }, tx)

      await this.repository.createStateLog(id, ParticipantState.ABSENT, managerId, tx)

      await this.auditService.record({
        action: 'PARTICIPANT_MARKED_ABSENT',
        entityType: 'Participant',
        entityId: id,
        actorId: managerId,
        payload: { eventId, reason: dto.reason },
      }, tx)
    })

    const updated = await this.repository.findById(id)
    return toParticipantResponse(updated!, this.storageService)
  }
```

Certificar que `ConflictException` está importado no topo do arquivo:
```typescript
import { ConflictException, Injectable, Inject, NotFoundException } from '@nestjs/common'
```

- [ ] **Step 3.4: Rodar para confirmar que passa**

```bash
cd packages/api && npx vitest run src/modules/participants/__tests__/participants.service.spec.ts --reporter=verbose 2>&1 | tail -15
```

Esperado: todos os testes passando (incluindo os 3 novos).

- [ ] **Step 3.5: Commit**

```bash
git add packages/api/src/modules/participants/participants.service.ts \
        packages/api/src/modules/participants/__tests__/participants.service.spec.ts
git commit -m "fix(participants): bloqueia markAbsent em participante ativo em julgamento (A8)"
```

---

## Task 4: Fix B7 — CORS nos WebSocket gateways

**Files:**
- Modify: `packages/api/src/modules/scoring/scoring.gateway.ts`
- Modify: `packages/api/src/modules/scoring/public-live.gateway.ts`

### Contexto

Ambos os gateways têm `cors: { origin: '*' }` hardcoded. Deve usar `process.env.CORS_ORIGIN` (que já está configurado via `env.ts`).

- [ ] **Step 4.1: Verificar que o gateway existente tem CORS wildcard**

```bash
grep -n "origin" /c/Users/Bruno/Desktop/www/jurados/sistema-julgamento/packages/api/src/modules/scoring/scoring.gateway.ts
grep -n "origin" /c/Users/Bruno/Desktop/www/jurados/sistema-julgamento/packages/api/src/modules/scoring/public-live.gateway.ts
```

Esperado: `origin: '*'` em ambos.

- [ ] **Step 4.2: Corrigir `scoring.gateway.ts`**

Localizar o decorador `@WebSocketGateway` e substituir:

```typescript
@WebSocketGateway({
  namespace: '/scoring',
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  },
})
```

- [ ] **Step 4.3: Corrigir `public-live.gateway.ts`**

Localizar o decorador `@WebSocketGateway` e substituir:

```typescript
@WebSocketGateway({
  namespace: '/public-live',
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  },
})
```

- [ ] **Step 4.4: Verificar que não quebrou testes existentes**

```bash
cd packages/api && npx vitest run src/modules/scoring/__tests__/scoring.gateway.spec.ts --reporter=verbose 2>&1 | tail -10
```

Esperado: 1 teste passando.

- [ ] **Step 4.5: Commit**

```bash
git add packages/api/src/modules/scoring/scoring.gateway.ts \
        packages/api/src/modules/scoring/public-live.gateway.ts
git commit -m "fix(scoring): substitui CORS wildcard por CORS_ORIGIN nos gateways WebSocket (B7)"
```

---

## Task 5: Fix B9 — Adicionar @fastify/helmet

**Files:**
- Modify: `packages/api/package.json`
- Modify: `packages/api/src/main.ts`

### Contexto

Fastify não inclui headers de segurança por padrão. `@fastify/helmet` adiciona `X-Frame-Options`, `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy` etc.

- [ ] **Step 5.1: Instalar a dependência**

```bash
cd packages/api && pnpm add @fastify/helmet
```

- [ ] **Step 5.2: Verificar instalação**

```bash
grep '"@fastify/helmet"' packages/api/package.json
```

Esperado: linha com a versão instalada.

- [ ] **Step 5.3: Registrar helmet no `main.ts`**

Abrir `packages/api/src/main.ts`. Adicionar o import no topo:

```typescript
import helmet from '@fastify/helmet'
```

E adicionar o registro **antes** de `app.enableCors(...)`:

```typescript
  // Helmet — headers de segurança HTTP
  await app.register(helmet, {
    contentSecurityPolicy: false, // desabilitado para não conflitar com API REST pura
  })

  app.enableCors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
```

> Nota: `contentSecurityPolicy: false` é apropriado para uma API REST pura (não serve HTML). Se o frontend for servido pelo mesmo servidor no futuro, revisar.

- [ ] **Step 5.4: Build da API para confirmar sem erros de type**

```bash
cd packages/api && npx tsc --noEmit 2>&1 | head -20
```

Esperado: nenhum erro.

- [ ] **Step 5.5: Commit**

```bash
git add packages/api/package.json packages/api/src/main.ts pnpm-lock.yaml
git commit -m "fix(api): adiciona @fastify/helmet para headers de segurança HTTP (B9)"
```

---

## Task 6: Fix H6 — Redis no health check

**Files:**
- Modify: `packages/api/src/modules/health/health.controller.ts`
- Modify: `packages/api/src/modules/health/health.module.ts`
- Create: `packages/api/src/modules/health/__tests__/health.controller.spec.ts`

### Contexto

O endpoint `/health` verifica apenas Postgres. Redis é crítico para BullMQ (geração de PDFs e certificados). Se Redis cair, health retorna 200 OK mas jobs falham.

- [ ] **Step 6.1: Escrever o teste que falha**

Criar `packages/api/src/modules/health/__tests__/health.controller.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HealthController } from '../health.controller'
import { ServiceUnavailableException } from '@nestjs/common'
import { PrismaService } from '../../../config/prisma.service'
import { PinoLogger } from 'nestjs-pino'
import Redis from 'ioredis'

function makePrisma(healthy = true) {
  return {
    $queryRaw: vi.fn().mockImplementation(() =>
      healthy ? Promise.resolve([{ '?column?': 1 }]) : Promise.reject(new Error('DB down')),
    ),
  } as unknown as PrismaService
}

function makeRedis(healthy = true) {
  return {
    ping: vi.fn().mockImplementation(() =>
      healthy ? Promise.resolve('PONG') : Promise.reject(new Error('Redis down')),
    ),
    status: healthy ? 'ready' : 'end',
  } as unknown as Redis
}

function makeLogger() {
  return { error: vi.fn(), info: vi.fn() } as unknown as PinoLogger
}

describe('HealthController', () => {
  it('retorna ok quando DB e Redis estão saudáveis', async () => {
    const controller = new HealthController(makePrisma(), makeRedis(), makeLogger())
    const result = await controller.check()

    expect(result.status).toBe('ok')
    expect(result.database).toBe('ok')
    expect(result.redis).toBe('ok')
  })

  it('lança ServiceUnavailableException quando Redis está down', async () => {
    const controller = new HealthController(makePrisma(), makeRedis(false), makeLogger())

    await expect(controller.check()).rejects.toThrow(ServiceUnavailableException)
  })

  it('lança ServiceUnavailableException quando DB está down', async () => {
    const controller = new HealthController(makePrisma(false), makeRedis(), makeLogger())

    await expect(controller.check()).rejects.toThrow(ServiceUnavailableException)
  })
})
```

- [ ] **Step 6.2: Rodar para confirmar que falha**

```bash
cd packages/api && npx vitest run src/modules/health/__tests__/health.controller.spec.ts --reporter=verbose 2>&1 | tail -15
```

Esperado: FAIL — `HealthController` não aceita parâmetro Redis.

- [ ] **Step 6.3: Verificar se ioredis já é dependência**

```bash
grep '"ioredis"' packages/api/package.json
```

Se não existe, instalar: `cd packages/api && pnpm add ioredis`

- [ ] **Step 6.4: Atualizar `health.module.ts`**

```typescript
import { Module } from '@nestjs/common'
import { HealthController } from './health.controller'
import { DatabaseModule } from '../../config/database.module'
import Redis from 'ioredis'
import { env } from '../../config/env'

export const REDIS_HEALTH_CLIENT = 'REDIS_HEALTH_CLIENT'

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
  providers: [
    {
      provide: REDIS_HEALTH_CLIENT,
      useFactory: () =>
        new Redis(env.REDIS_URL, {
          lazyConnect: true,
          connectTimeout: 3000,
          maxRetriesPerRequest: 1,
        }),
    },
  ],
})
export class HealthModule {}
```

- [ ] **Step 6.5: Verificar que `REDIS_URL` existe no env**

```bash
grep 'REDIS_URL\|REDIS' packages/api/src/config/env.ts 2>/dev/null || grep 'REDIS' packages/api/.env.example
```

Se `REDIS_URL` não estiver no `env.ts`, adicionar:

Em `packages/api/src/config/env.ts`, dentro do schema Zod:
```typescript
REDIS_URL: z.string().default('redis://localhost:6379'),
```

E no `.env.example`:
```
# Redis
REDIS_URL=redis://localhost:6379
```

- [ ] **Step 6.6: Atualizar `health.controller.ts`**

```typescript
import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { PrismaService } from '../../config/prisma.service'
import { Public } from '../../common/decorators/public.decorator'
import { SkipThrottle } from '@nestjs/throttler'
import Redis from 'ioredis'
import { REDIS_HEALTH_CLIENT } from './health.module'

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(REDIS_HEALTH_CLIENT) private readonly redis: Redis,
    @InjectPinoLogger(HealthController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Get()
  @Public()
  async check(): Promise<{ status: string; timestamp: string; database: string; redis: string }> {
    let databaseStatus = 'ok'
    let redisStatus = 'ok'
    let hasError = false

    try {
      await this.prisma.$queryRaw`SELECT 1`
    } catch (err) {
      this.logger.error({ err }, 'Health check — database falhou')
      databaseStatus = 'unreachable'
      hasError = true
    }

    try {
      await this.redis.ping()
    } catch (err) {
      this.logger.error({ err }, 'Health check — redis falhou')
      redisStatus = 'unreachable'
      hasError = true
    }

    if (hasError) {
      throw new ServiceUnavailableException({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: databaseStatus,
        redis: redisStatus,
      })
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'ok',
      redis: 'ok',
    }
  }
}
```

- [ ] **Step 6.7: Rodar o teste para confirmar que passa**

```bash
cd packages/api && npx vitest run src/modules/health/__tests__/health.controller.spec.ts --reporter=verbose 2>&1 | tail -15
```

Esperado: 3 testes passando.

- [ ] **Step 6.8: Verificar que os testes existentes de health ainda passam**

```bash
cd packages/api && npx vitest run --reporter=verbose 2>&1 | tail -15
```

- [ ] **Step 6.9: Commit**

```bash
git add packages/api/src/modules/health/health.controller.ts \
        packages/api/src/modules/health/health.module.ts \
        packages/api/src/modules/health/__tests__/health.controller.spec.ts \
        packages/api/src/config/env.ts \
        packages/api/.env.example
git commit -m "fix(health): adiciona verificação de Redis ao endpoint /health (H6)"
```

---

## Task 7: Fix J1 — Cobertura do módulo participants acima de 80%

**Files:**
- Modify: `packages/api/src/modules/participants/__tests__/participants.controller.spec.ts`
- Possibly modify: `packages/api/src/modules/participants/__tests__/participants.service.spec.ts`

### Contexto

`participants.controller.ts` está em 75.86% com linhas 88-118 descobertas. `participants.repository.ts` está em 13.49%. O foco é atingir 80% no módulo.

- [ ] **Step 7.1: Verificar quais linhas estão descobertas**

```bash
cd packages/api && npx vitest run src/modules/participants/ --coverage --reporter=verbose 2>&1 | grep -A5 'participants'
```

- [ ] **Step 7.2: Ler o controller para entender linhas 88-118**

```bash
sed -n '80,130p' packages/api/src/modules/participants/participants.controller.ts
```

- [ ] **Step 7.3: Adicionar testes faltantes ao controller spec**

Localizar `packages/api/src/modules/participants/__tests__/participants.controller.spec.ts` e adicionar testes para os endpoints das linhas descobertas. Baseado na estrutura típica do controller (upload de foto, reorder, mark-absent):

```typescript
describe('uploadPhoto', () => {
  it('chama service.uploadPhoto e retorna resultado', async () => {
    const mockResult = { id: 'p-1', name: 'Test', photoUrl: 'http://img.com/photo.jpg' }
    service.uploadPhoto.mockResolvedValue(mockResult)

    const mockRequest = {
      file: vi.fn().mockResolvedValue({
        filename: 'photo.jpg',
        mimetype: 'image/jpeg',
        file: { pipe: vi.fn() },
        toBuffer: vi.fn().mockResolvedValue(Buffer.from('img')),
      }),
    }

    const result = await controller.uploadPhoto('event-1', 'p-1', mockRequest as any, mockUser)
    expect(result).toEqual(mockResult)
  })
})

describe('markAbsent', () => {
  it('chama service.markAbsent com dto correto', async () => {
    const mockResult = { id: 'p-1', name: 'Test', isAbsent: true }
    service.markAbsent.mockResolvedValue(mockResult)

    const result = await controller.markAbsent('event-1', 'p-1', { reason: 'Faltou' }, mockUser)
    expect(service.markAbsent).toHaveBeenCalledWith('p-1', 'event-1', { reason: 'Faltou' }, mockUser.sub)
    expect(result).toEqual(mockResult)
  })
})
```

> Adaptar os nomes de método e parâmetros ao que existir no controller real (verificado no Step 7.2).

- [ ] **Step 7.4: Rodar cobertura do módulo**

```bash
cd packages/api && npx vitest run src/modules/participants/ --coverage 2>&1 | grep 'participants'
```

Esperado: cobertura `>= 80%` em statements, functions e lines.

- [ ] **Step 7.5: Rodar suite completa para verificar threshold global**

```bash
cd packages/api && npx vitest run --coverage 2>&1 | tail -15
```

Esperado: nenhuma mensagem de threshold violation.

- [ ] **Step 7.6: Commit**

```bash
git add packages/api/src/modules/participants/__tests__/
git commit -m "test(participants): adiciona testes faltantes para atingir cobertura 80% (J1)"
```

---

## Task 8: Atualizar relatório de auditoria com correções aplicadas

**Files:**
- Modify: `docs/audit-report-v1.0.1.md`

- [ ] **Step 8.1: Atualizar status de cada achado corrigido**

No relatório, marcar cada achado HIGH como `[FIXED]` com referência ao commit:

- A1: `- **Status:** [FIXED] — commit fix(scoring): previne sobrescrita...`
- A8: `- **Status:** [FIXED] — commit fix(participants): bloqueia markAbsent...`
- B7: `- **Status:** [FIXED] — commit fix(scoring): substitui CORS wildcard...`
- B9: `- **Status:** [FIXED] — commit fix(api): adiciona @fastify/helmet...`
- H6: `- **Status:** [FIXED] — commit fix(health): adiciona verificação de Redis...`
- J1: `- **Status:** [FIXED] — commit test(participants): adiciona testes faltantes...`

- [ ] **Step 8.2: Atualizar sumário executivo**

```markdown
## Sumário executivo

- Total de achados: 11
- CRITICAL: 0
- HIGH: 6 (6 corrigidos ✅)
- MEDIUM: 4 (em backlog)
- LOW: 1 (em backlog)

## Recomendação de release

- [x] Bloqueio: todos os achados HIGH corrigidos ✅
- [x] Backlog: MEDIUM e LOW registrados no PROJECT_PROGRESS.md
```

- [ ] **Step 8.3: Adicionar seção "Correções aplicadas"**

```markdown
## Correções aplicadas

| Achado | Commit | Data |
|---|---|---|
| A1 — Guard upsertScore | fix(scoring): previne sobrescrita de nota já finalizada | 2026-04-30 |
| A8 — Guard markAbsent | fix(participants): bloqueia markAbsent em participante ativo | 2026-04-30 |
| B7 — CORS WebSocket | fix(scoring): substitui CORS wildcard por CORS_ORIGIN | 2026-04-30 |
| B9 — Helmet | fix(api): adiciona @fastify/helmet para headers de segurança | 2026-04-30 |
| H6 — Redis health | fix(health): adiciona verificação de Redis ao /health | 2026-04-30 |
| J1 — Cobertura | test(participants): adiciona testes faltantes para 80% | 2026-04-30 |
```

- [ ] **Step 8.4: Commit**

```bash
git add docs/audit-report-v1.0.1.md
git commit -m "docs(audit): finaliza relatório com correções aplicadas"
```

---

## Task 9: Atualizar PROJECT_PROGRESS.md

**Files:**
- Modify: `PROJECT_PROGRESS.md`

- [ ] **Step 9.1: Registrar achados MEDIUM e LOW como backlog**

Adicionar seção "Pendências e dívida técnica" ao `PROJECT_PROGRESS.md`:

```markdown
## Pendências e dívida técnica (pós-v1.0.1)

> Achados da auditoria P20 classificados como MEDIUM ou LOW. Não bloqueiam produção.

- [ ] A6 — Decimal precision acumulada em médias (severidade: MEDIUM)
- [ ] B4 — Adicionar teste E2E para refresh token revogado em cascata (severidade: MEDIUM)
- [ ] B5 — Rate limit por email além de IP em /login (severidade: MEDIUM)
- [ ] B6 — Documentar limitação de access token JWT sem revogação imediata (severidade: LOW)
- [ ] C5 — Verificar guard em judges.service.ts:remove contra notas existentes (severidade: MEDIUM)
- [ ] C8 — Bloquear soft delete de evento IN_PROGRESS (severidade: MEDIUM)
- [ ] D1 — Documentar procedimento de re-hidratação de estado pós-reconnect no runbook (severidade: MEDIUM)
- [ ] D7 — Documentar comportamento de WebSocket com token expirado (severidade: MEDIUM)
- [ ] E2 — Adicionar índice em AuditLog.createdAt (severidade: MEDIUM)
- [ ] E6 — Rotina de limpeza de uploads órfãos (severidade: MEDIUM)
- [ ] G2 — Enriquecer payload de auditoria com diff antes/depois (severidade: MEDIUM)
- [ ] H1–H4 — Documentar backup/restore no troubleshooting.md (severidade: MEDIUM)
- [ ] I2 — Criar docs/troubleshooting.md (severidade: MEDIUM)
- [ ] I4 — Criar docs/runbook-evento.md (severidade: MEDIUM)
- [ ] J1-web — Aumentar cobertura de useLiveScoring (55%), useCertificates (29%), public-api.ts (0%) (severidade: MEDIUM)
- [ ] J3 — Mutation testing em calculation-engine e auth (severidade: LOW)
- [ ] J4 — Teste de carga simulando evento real (severidade: MEDIUM)
- [ ] J5 — Implementar testes E2E com Playwright (severidade: MEDIUM)
- [ ] D3 — Idempotência de eventos WebSocket no cliente (severidade: LOW)
- [ ] G3 — Propagar requestId aos logs de AuditService (severidade: LOW)
- [ ] I3 — Diagrama de arquitetura visual (severidade: LOW)
- [ ] I5 — Glossário de termos do domínio (severidade: LOW)
```

- [ ] **Step 9.2: Adicionar seção de auditoria ao histórico**

```markdown
## Auditoria final (P20)

**Data:** 2026-04-30
**Branch:** feature/p20-audit-final
**Relatório:** docs/audit-report-v1.0.1.md
**Achados totais:** 11
- CRITICAL: 0
- HIGH: 6 (todos resolvidos ✅)
- MEDIUM: 4 (em backlog)
- LOW: 1 (em backlog)
**Status:** ✅ Aprovado para v1.0.1
```

- [ ] **Step 9.3: Atualizar status no topo do PROJECT_PROGRESS.md**

Mudar a linha de status para:
```
Status: PROJETO COMPLETO — v1.0.1 lançado em 2026-04-30
```

- [ ] **Step 9.4: Commit**

```bash
git add PROJECT_PROGRESS.md
git commit -m "docs(progress): conclui P20 e registra backlog pós-v1.0.1"
```

---

## Task 10: Re-auditoria final — suite completa de testes e build

- [ ] **Step 10.1: Rodar lint**

```bash
cd /c/Users/Bruno/Desktop/www/jurados/sistema-julgamento && pnpm lint 2>&1 | tail -10
```

Esperado: sem erros.

- [ ] **Step 10.2: Rodar type-check em todos os pacotes**

```bash
cd /c/Users/Bruno/Desktop/www/jurados/sistema-julgamento && pnpm type-check 2>&1 | tail -20
```

Esperado: sem erros.

- [ ] **Step 10.3: Rodar testes com cobertura — API**

```bash
cd packages/api && npx vitest run --coverage 2>&1 | tail -25
```

Esperado: todos os testes passando, cobertura >= 80% em statements/functions/lines.

- [ ] **Step 10.4: Rodar testes com cobertura — Web**

```bash
cd /c/Users/Bruno/Desktop/www/jurados/sistema-julgamento/packages/web && npx vitest run --coverage 2>&1 | tail -15
```

- [ ] **Step 10.5: Rodar testes — Shared**

```bash
cd /c/Users/Bruno/Desktop/www/jurados/sistema-julgamento/packages/shared && npx vitest run 2>&1 | tail -10
```

- [ ] **Step 10.6: Build completo**

```bash
cd /c/Users/Bruno/Desktop/www/jurados/sistema-julgamento && pnpm build 2>&1 | tail -20
```

Esperado: build sem erros em todos os pacotes.

- [ ] **Step 10.7: Commit de verificação (se houver ajustes)**

Se algum ajuste foi necessário nos steps anteriores:
```bash
git add -A
git commit -m "fix: ajustes pós re-auditoria (lint/type/build)"
```

---

## Task 11: Criar PR

- [ ] **Step 11.1: Push da branch**

```bash
git push origin feature/p20-audit-final
```

- [ ] **Step 11.2: Criar Pull Request via GitHub CLI**

```bash
gh pr create \
  --title "P20: Auditoria final e hardening v1.0.1" \
  --base develop \
  --body "$(cat <<'EOF'
## Resumo

Auditoria completa (categorias A–J) do sistema v1.0.0. 11 achados identificados, 6 HIGH corrigidos.

### Achados e correções

| Achado | Severidade | Status |
|---|---|---|
| A1 — upsertScore sobrescreve nota finalizada | HIGH | ✅ FIXED |
| A8 — markAbsent não bloqueia participante ativo | HIGH | ✅ FIXED |
| B7 — CORS wildcard nos gateways WebSocket | HIGH | ✅ FIXED |
| B9 — @fastify/helmet ausente | HIGH | ✅ FIXED |
| H6 — /health não verifica Redis | HIGH | ✅ FIXED |
| J1 — participants module < 80% de cobertura | HIGH | ✅ FIXED |
| 5 achados MEDIUM + 1 LOW | MEDIUM/LOW | 📋 Backlog |

### Relatório completo

Ver `docs/audit-report-v1.0.1.md`

## Test plan

- [x] `pnpm lint` — sem erros
- [x] `pnpm type-check` — sem erros
- [x] `pnpm --filter @judging/api test:ci` — >= 80% cobertura
- [x] `pnpm --filter @judging/web test:ci` — passa
- [x] `pnpm build` — sem erros

🤖 Generated with [Claude Code](https://claude.ai/claude-code)
EOF
)"
```

---

## Task 12: Merge, tags e release v1.0.1

> **Executar apenas após CI verde e PR aprovado.**

- [ ] **Step 12.1: Squash merge PR na develop**

```bash
gh pr merge --squash --subject "feat: auditoria final e hardening v1.0.1 (#<numero>)"
```

- [ ] **Step 12.2: Merge develop → main**

```bash
git checkout main
git pull origin main
git merge --no-ff develop -m "release: v1.0.1 — Sistema completo após hardening"
git push origin main
```

- [ ] **Step 12.3: Criar tag v1.0.1**

```bash
git tag -a v1.0.1 -m "v1.0.1 — Sistema de Julgamento de Eventos completo (após auditoria final)"
git push origin v1.0.1
```

- [ ] **Step 12.4: Verificar tags**

```bash
git tag -l
```

Esperado: `v0.1.0 v0.2.0 v0.3.0 v1.0.0 v1.0.1` listadas.

- [ ] **Step 12.5: Criar release no GitHub**

```bash
gh release create v1.0.1 \
  --title "v1.0.1 — Sistema completo" \
  --notes "$(cat <<'EOF'
## v1.0.1 — Hardening pós-auditoria

Patch de segurança e qualidade aplicado após auditoria completa (P20) do sistema v1.0.0.

### Correções

- **fix(scoring):** Guard contra sobrescrita de nota já finalizada (A1)
- **fix(participants):** Bloqueio de marcar ausente participante em julgamento ativo (A8)
- **fix(scoring):** CORS dos gateways WebSocket usa variável de ambiente (B7)
- **fix(api):** @fastify/helmet instalado — headers de segurança HTTP (B9)
- **fix(health):** /health agora verifica Redis além de Postgres (H6)
- **test(participants):** Cobertura do módulo elevada para ≥ 80% (J1)

### Relatório de auditoria

Ver [docs/audit-report-v1.0.1.md](docs/audit-report-v1.0.1.md) para análise completa das 10 categorias (A–J).

### Backlog pós-v1.0.1

5 achados MEDIUM e 1 LOW registrados no PROJECT_PROGRESS.md para roadmap futuro.
EOF
)" \
  --latest
```

---

## Checklist final (Definition of Done)

- [ ] `docs/audit-report-v1.0.1.md` criado com todas as 10 categorias auditadas (A–J)
- [ ] Para cada item da seção 3.2 do prompt: registrado como achado ou OK
- [ ] Sumário executivo com contagem por severidade
- [ ] Todos os achados HIGH corrigidos com commit dedicado e teste
- [ ] Achados MEDIUM e LOW em "Pendências" do PROJECT_PROGRESS.md
- [ ] Re-auditoria com `[FIXED]` em todos os achados resolvidos
- [ ] `pnpm lint && pnpm type-check && pnpm build` verde
- [ ] Cobertura >= 80% em todos os pacotes
- [ ] Commits seguem Conventional Commits
- [ ] Tag `v1.0.1` criada e release publicada no GitHub
