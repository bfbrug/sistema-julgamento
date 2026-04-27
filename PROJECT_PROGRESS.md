# PROJECT_PROGRESS

> Rastreador de execução dos prompts de implementação do Sistema de Julgamento.

## Resumo

| Campo | Valor |
|---|---|
| **Prompts concluídos** | 1 de 20 |
| **Próximo prompt** | P01 — Bootstrap da API |
| **Última atualização** | 2026-04-27 |

---

## Lista de prompts

### Fase 0 — Fundação

- [x] **P00** — Setup do monorepo
- [ ] **P01** — Bootstrap da API
- [ ] **P02** — Bootstrap do Frontend

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

---

## Decisões técnicas

| Prompt | Decisão | Alternativa considerada | Aprovado? |
|---|---|---|---|
| P00 | pnpm fixado em 9.15.0 | range `^9.x` | ⏳ |
| P00 | turbo fixado em 2.5.3 | range `^2.x` | ⏳ |
| P00 | eslint 9.26.0 com formato `.cjs` (eslintrc legacy) | flat config (eslint.config.js) | ⏳ |
| P00 | vitest 3.1.3 apenas em `shared` por ora | instalar em todos os pacotes | ⏳ |
