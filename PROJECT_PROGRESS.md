# PROJECT_PROGRESS

> Rastreador de execução dos prompts de implementação do Sistema de Julgamento.

## Resumo

| Campo | Valor |
|---|---|
| **Prompts concluídos** | 14 de 20 |
| **Fase atual** | 5 — Relatórios e certificados |
| **Próximo prompt** | P14 — Geração de PDF com Puppeteer |
| **Última atualização** | 2026-04-29 |

---

## Lista de prompts

### Fase 0 — Fundação

- [x] **P00** — Setup do monorepo
- [x] **P01** — Bootstrap da API
- [x] **P02** — Bootstrap do Frontend

### Fase 1 — Autenticação

- [x] **P03** — Autenticação JWT
- [x] **P04** — Frontend de autenticação

### Fase 2 — Domínio base

- [x] **P05** — Schema Prisma do domínio
- [x] **P06** — Pacote shared (tipos + Zod schemas)

### Fase 3 — Julgamento

- [x] **P07** — Módulo events (CRUD de evento + configurações)
- [x] **P08** — Módulo categories
- [x] **P09** — Módulo judges
- [x] **P10** — Módulo participants


### Fase 4 — Motor de julgamento

- [x] **P11** — Scoring gateway com WebSocket
- [x] **P12** — Motor de cálculo (R1 e R2)
- [x] **P13** — Cascata de desempate

### Fase 5 — Relatórios e certificados

- [ ] **P14** — Geração de PDF com Puppeteer
- [ ] **P15** — Módulo de certificados
- [ ] **P16** — Upload de imagens (background, assinatura)

### Fase 6 — Qualidade e produção

- [ ] **P17** — Testes E2E com Playwright
- [ ] **P18** — Auditoria de domínio
- [ ] **P19** — Hardening de segurança e rate limiting

---

## Histórico de execução

| Prompt | Concluído em | Branch mergeada | Cobertura final | Observações |
|---|---|---|---|---|
| P00 | 2026-04-27 | feature/p00-setup-monorepo | N/A — sem código de produção | pnpm fixado em 9.15.0; turbo 2.5.3; typescript 5.8.3; eslint 9.26.0 |
| P01 | 2026-04-28 | feature/p01-bootstrap-api | statements 98%, branches 82%, functions 100%, lines 98% | NestJS 11 + Fastify; @Inject explícito para PrismaService (conflito PrismaClient Proxy + NestJS DI); postgres na porta 5434 (5432 ocupada por outro container) |
| P02 | 2026-04-28 | feature/p02-bootstrap-web | statements 100%, branches 96%, functions 100%, lines 100% | Next.js 15 + React 19 + Tailwind 4; Geist font; singleFork no Vitest (OOM com workers paralelos); cross-env para NODE_OPTIONS no build Windows |
| P03 | 2026-04-28 | feature/p03-modulo-auth | statements 89.06%, branches 84.52%, functions 83.33%, lines 89.06% | @nestjs/jwt e passport; Refresh tokens salvos como hash no banco; JwtAuthGuard e RolesGuard globais; `swc` / metadata ausente do Vitest contornado usando `@Inject` explícito nos construtores |
| P04 | 2026-04-28 | feature/p04-modulo-users | statements 81.95%, branches 85.31%, functions 84.5%, lines 81.95% | CRUD com roles GESTOR e JURADO; bypass soft delete com `undefined`; @Inject() mantido para SWC |
| P05 | 2026-04-28 | feature/p05-schema-prisma | statements 82.18%, branches 84.86%, functions 85.13%, lines 82.18% | 12 novos modelos; removido JUDGE_FINISHED do enum; seeder exportando main para uso nos testes |
| P06 | 2026-04-28 | feature/p06-pacote-shared | statements 82.2%, branches 80%, functions 80%, lines 82.2% | Tipos e schemas Zod compartilhados; reexports por sub-path; linting e vitest globals configurados |
| P07 | 2026-04-28 | feature/p07-modulo-events | 141 testes passando; thresholds atingidos | CRUD de eventos; máquina de estados DRAFT→REGISTERING→IN_PROGRESS→FINISHED; tiebreaker e certificate-text; isolamento por gestor (404 em vez de 403); DTOs excluídos da cobertura (declarações puras) |
| P08 | 2026-04-28 | feature/p08-modulo-categories | statements 85.63%, branches 85.18%, functions 80.74%, lines 85.63% | CRUD de categorias aninhado em events/:eventId/categories; reorder atômico com PATCH /reorder declarado antes de PATCH /:id (conflito Fastify); compactação de displayOrder após remoção; bloqueio em IN_PROGRESS e FINISHED; proteção CATEGORY_HAS_SCORES e CATEGORY_REFERENCED_BY_TIEBREAKER; 163 testes passando |
| P09 | 2026-04-28 | feature/p09-modulo-judges | statements 88.8%, branches 87.64%, functions 84.97%, lines 88.8% | CRUD de jurados aninhado em events/:eventId/judges; matriz Jurado×Categoria com GET/PUT/POST validate; validador puro (5 RNs); R2 com cobertura insuficiente gera warning (fallback R1); bloqueio de cell com scores; atomicidade via $transaction; 218 testes passando |
| P10 | 2026-04-29 | feature/p10-modulo-participants | statements 90%, branches 90%, functions 92%, lines 90% | CRUD aninhado; reorder atômico no banco; upload de foto local com validação de magic bytes (`file-type`); proteção contra path traversal; mark-absent isolando logicamente de WAITING; 271 testes passando |
| P11 | 2026-04-29 | feature/p11-scoring-gateway | Unit 90%, Service tests 44% (overall 6.57%) | Implementação do Scoring Gateway (WS) + Máquina de Estados; Tabela JudgeParticipantSession; Transação serializable com lock FOR UPDATE; Auditoria de todas as ações de scoring. |
| P12 | 2026-04-29 | feature/p12-calculation-engine | statements 100%, branches 98.91%, functions 100%, lines 100% | R1 e R2 strategies com fallback R1; CalculationService isolado com cache em memória (TTL 30s) e invalidação no finalizeScores; Helpers numéricos Kahan sum e banker's rounding implementados. |
| P13 | 2026-04-29 | feature/p13-tiebreaker | 100% no módulo tiebreaker, 95% total | Cascata de desempate determinística (2 níveis); Extrator de agregados R1/R2; Endpoint /top com expansão na fronteira; 68 testes no módulo de cálculo. |

### 2026-04-29 — Tag v0.4.0 — Fim da Fase 4
### 2026-04-28 — Tag v0.2.0 — Fim da Fase 2

---

## Decisões técnicas

| Prompt | Decisão | Alternativa considerada | Aprovado? |
|---|---|---|---|
| P00 | pnpm fixado em 9.15.0 | range `^9.x` | ⏳ |
| P00 | turbo fixado em 2.5.3 | range `^2.x` | ⏳ |
| P00 | eslint 9.26.0 com formato `.cjs` (eslintrc legacy) | flat config (eslint.config.js) | ⏳ |
| P00 | vitest 3.1.3 apenas em `shared` por ora | instalar em todos os pacotes | ⏳ |
| P01 | @Inject(PrismaService) explícito no HealthController | injeção implícita por tipo | ✅ |
| P01 | pool: 'forks' + test.env no vitest.config para propagar DATABASE_URL | dotenv no setupFiles (hoisting ESM impede) | ✅ |
| P01 | tsconfig.build.json separado para build (rootDir: src) | rootDir no tsconfig principal | ✅ |
| P02 | Vitest com pool: forks + singleFork: true | workers paralelos (OOM em Windows com jsdom) | ✅ |
| P02 | cross-env NODE_OPTIONS=--max-old-space-size=4096 no build | definir variável no shell do CI | ✅ |
| P02 | globals browser+node no eslint.config.mjs raiz, escopo packages/web | .eslintrc local (conflita com flat config) | ✅ |
| P02 | Sidebar e PublicHeader excluídos da cobertura (stubs sem lógica) | adicionar testes de snapshot | ✅ |
| P03 | Uso de `@Inject()` explícito em `AuthService` e Guards | Adicionar `@swc/core` e plugar no Vitest | ✅ |
| P04 | Middleware `prisma.$use` para soft delete de `User` com bypass via `deletedAt: undefined` | Prisma Extension `$extends` | ✅ |
| P06 | Uso de sub-paths no `exports` do shared | export único no index.ts | ✅ |
| P06 | Vitest globals injetados via `tsconfig` e `eslint.config.mjs` | imports manuais em cada arquivo | ✅ |
| P06 | Substituição de `any` por `unknown` em guards e services da API | manter `any` e suprimir lint | ✅ |
| P07 | DTOs excluídos da cobertura do Vitest (`**/dto/**`) | testes de validação de DTO (desnecessário para declarações puras) | ✅ |
| P07 | Isolamento por gestor retorna 404 (não 403) para eventos de outros gestores | 403 Forbidden | ✅ |
| P07 | EventStateMachine como classe pura sem injeção de dependência | injetar como provider NestJS | ✅ |
