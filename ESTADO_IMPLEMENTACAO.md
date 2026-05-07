# Estado da Implementação — Distinção de Gênero e Liberação de Resultados

**Branch:** `feat/gender-distinction-and-result-release`
**Plano:** [docs/superpowers/plans/2026-05-07-distincao-genero-e-liberacao-resultados.md](docs/superpowers/plans/2026-05-07-distincao-genero-e-liberacao-resultados.md)
**Spec:** [docs/superpowers/specs/2026-05-07-distincao-genero-e-liberacao-resultados-design.md](docs/superpowers/specs/2026-05-07-distincao-genero-e-liberacao-resultados-design.md)

---

## Progresso

### ✅ Tarefa 1 — Schema e Migration (commit `6f27cb1` + fix `6b642a3`)

- Enums `Gender { MALE FEMALE }` e `CategoryGenderMode { MIXED MALE_ONLY FEMALE_ONLY UNISEX_SPLIT }` adicionados ao schema
- `Participant.gender Gender` (NOT NULL) + `@@index([eventId, gender])`
- `Category.genderMode CategoryGenderMode @default(MIXED)`
- Model `ResultRelease` criado com partial unique indexes (fix para nullable gender)
- Relações inversas em `JudgingEvent`, `Category`, `User`
- Migration aplicada: `20260507000000_add_gender_and_result_release`
- Fix migration: `20260507000001_fix_result_release_unique` (partial indexes + index em releasedById)

### ✅ Tarefa 2 — DTOs e Validações de Participante e Categoria (commits `bc62450`, `7444b50`)

- `CreateParticipantDto`: `gender!: Gender` com `@IsEnum`
- `UpdateParticipantDto`: `gender?: Gender` com `@IsOptional @IsEnum`
- `BulkCreateParticipantsDto`: `gender!: Gender` (flat — um gênero por lote)
- `ParticipantResponseDto`: expõe `gender`
- `CreateCategoryDto` / `UpdateCategoryDto`: `genderMode?: CategoryGenderMode`
- `CategoryResponseDto`: expõe `genderMode`
- `participants.service.ts`: `gender` passado em `create`, `update`, `bulkCreate`
- `categories.service.ts`: `genderMode` com default `MIXED` em `create` e `update`
- `seed.ts`: gêneros alternados nos participantes do seed

### ✅ Tarefa 3 — Import CSV/XLSX — utilitário normalizeGender (commit `3d78cba`)

- `packages/api/src/modules/participants/utils/normalize-gender.ts` criado
- Aceita: M, m, Masculino, Male → MALE; F, f, Feminino, female → FEMALE
- Lança erros claros para ausente/inválido
- 12 testes passando
- Barrel export em `utils/index.ts`

### ✅ Tarefa 4 — Cálculo de Ranking com `genderMode` (commit `0262a79`)

- `RankingBuilderService.computeRanking(eventId, categoryId)` implementado com os 4 modos:
  - `MIXED` → classificação única
  - `MALE_ONLY` / `FEMALE_ONLY` → filtro por gênero
  - `UNISEX_SPLIT` → classificações separadas por masculino/feminino
- `buildClassification`, `buildTopN`, `buildTopNByCategory`, `buildAbsents`, `buildDetailedByJudge`
- Testes passando

### ✅ Tarefa 5.5 — Refatoração: Ranking Geral por Gênero (não por categoria)

**Data:** 2026-05-07
**Branch:** `feat/gender-distinction-and-result-release` (continuação)
**Plano:** [docs/superpowers/plans/2026-05-07-ranking-geral-por-genero.md](docs/superpowers/plans/2026-05-07-ranking-geral-por-genero.md)

#### Resumo da mudança arquitetural
- `Category.genderMode` removido; `JudgingEvent.genderMode` adicionado
- `ResultRelease.categoryId` removido; liberação agora é por evento (nível geral)
- Ranking de liberação passa a ser agregado no nível do evento (média dos `finalScore` entre categorias via `CalculationService`)
- Categorias voltam a ser apenas dimensões de avaliação

#### API
- **Schema:** migration `20260507183000_overall_ranking_per_gender` — DROP `gender_mode` em `categories`, DROP `categoryId` em `result_releases`, ADD `gender_mode` em `judging_events`, renomeia enum `CategoryGenderMode` → `EventGenderMode`
- **Events:** DTOs e service propagam `genderMode`; audit `EVENT_GENDER_MODE_CHANGED`
- **Categories:** removido `genderMode` de DTOs, service e response
- **RankingBuilder:** novo `computeOverallRanking(eventId, managerId)` usando `finalScore` do `CalculationService`; `buildTopNByCategory` sem split de gênero; removido `computeRanking` por categoria
- **ResultReleases:** `release` valida contra `event.genderMode` e usa `computeOverallRanking`; `getFullRanking` retorna `{ genderMode, ranking }`; `list` ordena por `gender, position`
- **PublicEvents:** `getPublicResults` retorna `{ eventGenderMode, released: { MIXED?, MALE?, FEMALE? } }`
- **Reports:** template `top-n.hbs` simplificado (sem split por gênero); `buildTopNByCategory` retorna `{ categoryId, categoryName, entries }`
- **Seed:** `genderMode: UNISEX_SPLIT` no evento de teste

#### Web
- **EventForm:** select de `genderMode` adicionado (MIXED, MALE_ONLY, FEMALE_ONLY, UNISEX_SPLIT)
- **CategoriesPage:** removido select de `genderMode` do formulário e badge da listagem
- **Hooks:** `useLiveResults` e `useFullRanking` atualizados para formato event-level; `usePublicResults` consome novo shape público
- **ReleasePanel:** renderiza ranking geral do evento (1 ou 2 colunas conforme `event.genderMode`)
- **PublicResultsBoard:** exibe bloco único de ranking geral (ou split)
- **Live pages:** admin e pública passam `ranking` / `results` nos novos formatos

#### Shared
- `EventGenderMode` adicionado aos enums; `CategoryGenderMode` removido
- `createEventSchema` exige `genderMode`; `createCategorySchema` remove `genderMode`

#### Testes
- API: 507 tests passando (58 files)
- Web: 184 tests passando (44 files)

### ✅ Tarefa 5 — Endpoints de Liberação de Resultados (commit `261b8f5`)

- Módulo `result-releases` com service, controller, DTOs
- Endpoints:
  - `GET /events/:id/results/releases`
  - `POST /events/:id/results/releases`
  - `DELETE /events/:id/results/releases/:releaseId`
- Testes passando (11 testes no service)

### ✅ Tarefa 6 — Gateway WebSocket Público (commits `261b8f5`, `cf4ba43`)

- `ResultReleasesGateway` emitindo `result:released` / `result:unreleased`
- Endpoint público `GET /public/events/:id/results` com posições liberadas por categoria
- Integração com namespace/room do gateway existente `public-live.gateway.ts`

### ✅ Tarefa 7 — Web: Forms de Evento e Categoria com `genderMode` (commit `9c0ad9c`)

- Select de `genderMode` no componente de linha de categoria nos forms new/edit de evento
- Badge `genderMode` exibido na listagem de categorias

### ✅ Tarefa 8 — Web: Cadastro/Listagem/Import de Participante com Gênero (commit `7c4cfae`)

- Form individual com radio M/F
- Listagem com coluna gênero + filtro
- ImportParticipantsModal com preview de coluna gênero, validação por linha, valores aceitos documentados no help

### ✅ Tarefa 9 — Web: Tela Admin Live com Painel de Liberação (commit `dcd06f5`)

- Hook `useLiveResults`, componentes `ReleaseSlot` e `ReleasePanel`
- Painel renderizado quando evento está `FINISHED`
- Backend: endpoint `GET /events/:id/results/full` disponível

### ✅ Tarefa 10 — Web: Tela Live Pública com Revelação Progressiva (commit `cdf2bad`)

- Hook `usePublicResults`, componente `PublicResultsBoard`
- Animação com framer-motion para revelação progressiva dos resultados
- Suporte a split por gênero quando categoria é `UNISEX_SPLIT`
- Fix (commit `5c9e384`): remove `finalResults` morto, expõe erro de fetch

### ✅ Tarefa 11 — Auditoria de Mudanças em Categoria/Participante (commit `559470d`)

- Audit log `CATEGORY_GENDER_MODE_CHANGED` no service de categorias
- Audit log `PARTICIPANT_GENDER_CHANGED` no service de participantes

### ✅ Tarefa 12 — Relatórios e Certificados Refletindo Distinção (commit `1456051` + fix `a8230f5`)

- `RankingBuilderService` integrado ao `ReportsProcessor`
- `buildTopNByCategory` respeita `genderMode` de cada categoria
- Geradores TOP_N, GENERAL e DETAILED_BY_JUDGE atualizados
- Certificados refletem `genderMode`
- Fix: remove campo morto `partialsRegistered`, torna `managerId` required em `buildBatchData`
- **512 testes passando** na API (58 arquivos) + **184 testes passando** no Web (44 arquivos) = **696 testes no total**

### ⬜ Tarefa 13 — E2E e Verificação Manual

Roteiro manual completo descrito no plano.

#### Pré-verificações automatizadas realizadas nesta sessão:
- ✅ **TypeScript sem erros** em API e Web
- ✅ **696 testes passando** (512 API + 184 Web)
- ✅ **Build Web**: compilação, lint e typecheck passam; 16 páginas estáticas geradas. Falha final foi `EPERM` (permissão de symlink no Windows) — problema de ambiente.
- ✅ **Docker Compose config** válido

#### Correções aplicadas nesta sessão:
- `reports.processor.spec.ts`: mock `buildTopN` → `buildTopNByCategory` (regressão T12)
- `useLiveScoring.spec.tsx`: adicionado `onAny` ao mock do socket (regressão T6)
- `live/page.spec.tsx`: mocks de `useEvent` e `useFullRanking`; seletor "Marcar Ausente" → "Ausente" (regressão T9)
- `PublicResultsBoard.spec.tsx`: adicionado import do Vitest
- `certificates.service.spec.ts`: adicionado mock do `RankingBuilderService` (regressão T12)
- Testes de participants: adicionado `gender` nos DTOs (regressão T2)
- `live/[eventId]/page.tsx`: removido import não utilizado `EventFinishedView` (regressão T10)
- **Bugfix**: `events/[id]/live/page.tsx` — removido redirecionamento `router.push('/reports')` ao finalizar evento. Agora o `ReleasePanel` permanece visível para liberação posição-por-posição.
- **Bugfix**: `events/[id]/layout.tsx` — adicionado botão "Painel de Liberação" no header quando evento está `FINISHED` (antes sumia o acesso à tela live ao finalizar).

---

## Notas importantes para nova sessão

1. **`BulkCreateParticipantsDto.gender` é flat** (um gênero por lote, não por item). Decisão consciente para o fluxo atual. O import modal no frontend já reflete isso.

2. **Partial unique indexes em `result_releases`** — não usar `@@unique` no Prisma para esta tabela; os índices parciais na migration cobrem o caso de nullable gender.

3. **`public-live.gateway.ts`** e `ResultReleasesGateway` compartilham convenções de namespace/room.

4. **696 testes passando** no momento. Manter verde.

5. **Não há dados em produção** — migrations podem ser agressivas sem preocupação com backfill.

6. **Build no Windows requer privilégios de symlink** (Developer Mode) para a etapa `standalone` do Next.js. Em Linux/macOS ou CI não há esse problema.
