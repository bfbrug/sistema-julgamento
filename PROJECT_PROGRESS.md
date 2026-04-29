# PROJECT_PROGRESS

> Rastreador de execução dos prompts de implementação do Sistema de Julgamento.

## Resumo

| Campo | Valor |
|---|---|
| **Prompts concluídos** | 15 de 20 |
| **Fase atual** | 5 — Relatórios e certificados |
| **Próximo prompt** | P15 — UI do jurado |
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
- [x] **P14** — UI do gestor (cadastros e gestão da fila)

### Fase 5 — Relatórios e certificados

- [ ] **P15** — UI do jurado
- [ ] **P16** — Painel ao vivo público
- [ ] **P17** — Geração de PDF com Puppeteer
- [ ] **P18** — Módulo de certificados
- [ ] **P19** — Upload de imagens (background, assinatura)

### Fase 6 — Qualidade e produção

- [ ] **P20** — Testes E2E com Playwright


---

## Histórico de execução

| Prompt | Concluído em | Branch mergeada | Cobertura final | Observações |
|---|---|---|---|---|
| P00 | 2026-04-27 | feature/p00-setup-monorepo | N/A | pnpm fixado em 9.15.0; turbo 2.5.3; typescript 5.8.3; eslint 9.26.0 |
| P01 | 2026-04-28 | feature/p01-bootstrap-api | 98% | NestJS 11 + Fastify; @Inject explícito para PrismaService |
| P02 | 2026-04-28 | feature/p02-bootstrap-web | 100% | Next.js 15 + React 19 + Tailwind 4; Geist font |
| P03 | 2026-04-28 | feature/p03-modulo-auth | 89% | Refresh tokens com hash; JwtAuthGuard globais |
| P04 | 2026-04-28 | feature/p04-modulo-users | 82% | CRUD com roles GESTOR e JURADO; soft delete bypass |
| P05 | 2026-04-28 | feature/p05-schema-prisma | 82% | 12 novos modelos; removido JUDGE_FINISHED |
| P06 | 2026-04-28 | feature/p06-pacote-shared | 82% | Tipos e schemas Zod compartilhados |
| P07 | 2026-04-28 | feature/p07-modulo-events | 100% | Máquina de estados DRAFT→FINISHED; isolamento por gestor |
| P08 | 2026-04-28 | feature/p08-modulo-categories | 85% | CRUD aninhado; reorder atômico; proteção CATEGORY_HAS_SCORES |
| P09 | 2026-04-28 | feature/p09-modulo-judges | 88% | Matriz Jurado×Categoria; fallback R1 warning |
| P10 | 2026-04-29 | feature/p10-modulo-participants | 90% | CRUD aninhado; reorder atômico; upload de foto |
| P11 | 2026-04-29 | feature/p11-scoring-gateway | 90% (Unit) | Scoring Gateway WS; Lock serializable; Auditoria |
| P12 | 2026-04-29 | feature/p12-calculation-engine | 100% | R1/R2 strategies; Kahan sum; banker's rounding |
| P13 | 2026-04-29 | feature/p13-tiebreaker | 95% | Cascata de desempate determinística (2 níveis) |
| P14 | 2026-04-29 | feature/p14-ui-gestor | 54% | Login real; interceptor refresh; CRUDs completos; Matriz; Live Control WS |


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
