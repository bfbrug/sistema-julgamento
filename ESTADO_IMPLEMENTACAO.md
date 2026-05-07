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
- 478 testes passando

### ✅ Tarefa 3 — Import CSV/XLSX — utilitário normalizeGender (commit `3d78cba`)

- `packages/api/src/modules/participants/utils/normalize-gender.ts` criado
- Aceita: M, m, Masculino, Male → MALE; F, f, Feminino, female → FEMALE
- Lança erros claros para ausente/inválido
- 12 testes passando
- Barrel export em `utils/index.ts`

---

## Pendente

### ⬜ Tarefa 4 — Cálculo de Ranking com `genderMode`

Localizar serviço de resultados (provavelmente `modules/reports` ou `modules/results`).
Implementar `computeRanking(eventId, categoryId): Promise<RankingResult>` com os 4 modos.
Ver plano para código completo e testes.

### ⬜ Tarefa 5 — Endpoints de Liberação de Resultados

Novo módulo `result-releases` com service, controller, DTO.
Endpoints: `GET/POST /events/:id/results/releases` e `DELETE /:releaseId`.
Ver plano para código completo.

### ⬜ Tarefa 6 — Gateway WebSocket Público

`ResultReleasesGateway` emitindo `result:released` / `result:unreleased`.
Endpoint público `GET /public/events/:id/results`.
Ver plano — verificar namespace do `public-live.gateway.ts` existente antes de implementar.

### ⬜ Tarefa 7 — Web: Forms de Evento e Categoria com `genderMode`

Select de `genderMode` no componente de linha de categoria nos forms new/edit de evento.
Ver plano para código do select e teste.

### ⬜ Tarefa 8 — Web: Cadastro/Listagem/Import de Participante com Gênero

Form individual (radio M/F), listagem (coluna + filtro), ImportParticipantsModal (coluna gênero no preview, validação por linha, valores aceitos no help).
Ver plano para código.

### ⬜ Tarefa 9 — Web: Tela Admin Live com Painel de Liberação

Hook `useLiveResults`, componentes `ReleaseSlot` e `ReleasePanel`.
Renderizar painel quando evento `FINISHED`.
Backend pode precisar de endpoint `GET /events/:id/results/full` — verificar antes.
Ver plano para código completo.

### ⬜ Tarefa 10 — Web: Tela Live Pública com Revelação Progressiva

Hook `usePublicResults`, componente `PublicResultsBoard`.
Animação com framer-motion (verificar se está instalado em `packages/web/package.json`).
Ver plano para código.

### ⬜ Tarefa 11 — Auditoria de Mudanças em Categoria/Participante

Audit log `CATEGORY_GENDER_MODE_CHANGED` e `PARTICIPANT_GENDER_CHANGED` nos services de update.
Ver plano.

### ⬜ Tarefa 12 — Relatórios e Certificados Refletindo Distinção

Atualizar geradores TOP_N, DETAILED_BY_JUDGE e certificados para respeitar `genderMode`.
Ver plano.

### ⬜ Tarefa 13 — E2E e Verificação Manual

Roteiro manual completo descrito no plano.

---

## Notas importantes para nova sessão

1. **`BulkCreateParticipantsDto.gender` é flat** (um gênero por lote, não por item). Decisão consciente para o fluxo atual. A Tarefa 8 (frontend) deve refletir isso no import modal.

2. **Partial unique indexes em `result_releases`** — não usar `@@unique` no Prisma para esta tabela; os índices parciais na migration cobrem o caso de nullable gender.

3. **Verificar `public-live.gateway.ts`** antes de implementar Tarefa 6 — o gateway de liberação deve usar o mesmo namespace e convenção de room.

4. **478 testes passando** no momento da pausa. Manter verde ao longo das próximas tarefas.

5. **Não há dados em produção** — migrations podem ser agressivas sem preocupação com backfill.
