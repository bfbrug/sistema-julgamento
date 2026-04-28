# PROJECT_PROGRESS

> Rastreador de execução dos prompts de implementação do Sistema de Julgamento.

## Resumo

| Campo | Valor |
|---|---|
| **Prompts concluídos** | 3 de 20 |
| **Fase atual** | 1 — Autenticação e usuários |
| **Próximo prompt** | P03 — Autenticação JWT |
| **Última atualização** | 2026-04-28 |

---

## Lista de prompts

### Fase 0 — Fundação

- [x] **P00** — Setup do monorepo
- [x] **P01** — Bootstrap da API
- [x] **P02** — Bootstrap do Frontend

### Fase 1 — Autenticação

- [ ] **P03** — Autenticação JWT
- [ ] **P04** — Frontend de autenticação

### Fase 2 — Domínio base

- [ ] **P05** — Schema Prisma e migrations
- [ ] **P06** — CRUD de eventos e categorias

### Fase 3 — Julgamento

- [ ] **P07** — Módulo de participantes
- [ ] **P08** — Módulo de jurados
- [ ] **P09** — Registro de notas
- [ ] **P10** — Apuração e resultados

### Fase 4 — Tempo real

- [ ] **P11** — Scoring gateway com WebSocket
- [ ] **P12** — Frontend de julgamento em tempo real
- [ ] **P13** — Painel do organizador

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
