# Refatoração: Ranking Geral por Gênero (não por categoria) — Plano de Implementação

> **Para agentes executores:** SUB-SKILL OBRIGATÓRIA: Use superpowers:subagent-driven-development (recomendada) ou superpowers:executing-plans para implementar este plano tarefa-por-tarefa. Os passos usam sintaxe de checkbox (`- [ ]`) para rastreamento.

**Objetivo:** Trocar a liberação de resultados de "posição × categoria × gênero" para "posição × gênero" sobre o ranking geral do evento (média aritmética dos finalScores entre categorias). Categorias deixam de ter modo de gênero e voltam a ser apenas dimensões de avaliação.

**Arquitetura:** `Category.genderMode` é removido. `JudgingEvent` ganha `genderMode: MIXED | MALE_ONLY | FEMALE_ONLY | UNISEX_SPLIT`. O `RankingBuilderService` ganha um novo método `computeOverallRanking(eventId, managerId)` que usa o `finalScore` já calculado pelo `CalculationService` (R1 ou R2 conforme `calculationRule` do evento) e particiona por gênero conforme `event.genderMode`. `ResultRelease` perde `categoryId`. Painel admin de liberação e tela pública passam a exibir um único ranking geral (ou dois, em UNISEX_SPLIT). Cálculos por categoria permanecem para relatórios detalhados (DETAILED_BY_JUDGE).

**Stack:** NestJS + Prisma + Postgres (API), Next.js + React Query + framer-motion (Web), Vitest + Jest, Socket.IO. Sem dados em produção — migration agressiva permitida.

---

## Estrutura de Arquivos

**API — modificados:**
- `packages/api/prisma/schema.prisma` — remove `Category.genderMode`; adiciona `JudgingEvent.genderMode`; remove `ResultRelease.categoryId` (e relação inversa em `Category`)
- `packages/api/prisma/migrations/<nova>/migration.sql` — DROP coluna em `categories`, DROP coluna+índice+FK em `result_releases`, ADD coluna em `judging_events`
- `packages/api/src/modules/events/dto/create-event.dto.ts` + `update-event.dto.ts` + `event-response.dto.ts` — campo `genderMode`
- `packages/api/src/modules/events/events.service.ts` — propaga `genderMode` em create/update; audit `EVENT_GENDER_MODE_CHANGED`
- `packages/api/src/modules/categories/dto/create-category.dto.ts` + `update-category.dto.ts` + `category-response.dto.ts` — remove `genderMode`
- `packages/api/src/modules/categories/categories.service.ts` — remove referências a `genderMode`; remove audit `CATEGORY_GENDER_MODE_CHANGED`
- `packages/api/src/modules/reports/ranking-builder.service.ts` — adiciona `computeOverallRanking`; remove `computeRanking(categoryId)` (e tipo `RankingResult` com base em categoryGenderMode); `buildTopNByCategory` deixa de aplicar split
- `packages/api/src/modules/result-releases/result-releases.service.ts` — `release` aceita `(gender?, position)`, valida contra `event.genderMode`, lê `computeOverallRanking`; `getFullRanking` retorna ranking geral; `list` ordena por `gender, position`
- `packages/api/src/modules/result-releases/dto/create-result-release.dto.ts` — remove `categoryId`
- `packages/api/src/modules/result-releases/result-releases.controller.ts` — endpoints inalterados na rota, mas DTO mudou
- `packages/api/src/modules/result-releases/result-releases.gateway.ts` — payloads do socket sem `categoryId`
- `packages/api/src/modules/public-events/public-events.controller.ts` (ou onde estiver `GET /public/events/:id/results`) — retorna `released: { MIXED?: [], MALE?: [], FEMALE?: [] }` no nível do evento, não por categoria
- `packages/api/src/seed/seed.ts` — remove `genderMode` dos seeds de categoria; adiciona em evento

**API — testes:**
- `packages/api/src/modules/result-releases/__tests__/result-releases.service.spec.ts`
- `packages/api/src/modules/reports/__tests__/ranking-builder.service.spec.ts` (criar se não existir; senão atualizar)
- `packages/api/src/modules/events/__tests__/events.service.spec.ts`
- `packages/api/src/modules/categories/__tests__/categories.service.spec.ts`
- `packages/api/src/modules/reports/__tests__/reports.processor.spec.ts`

**Shared:**
- `packages/shared/src/...` — onde `CategoryGenderMode` é re-exportado: trocar por `EventGenderMode` (mesmo enum, novo nome) ou manter o enum único e só mover de Category para Event

**Web — modificados:**
- `packages/web/src/app/(admin)/events/new/page.tsx` (ou form de evento) — Select de `genderMode` no nível do evento
- `packages/web/src/app/(admin)/events/[id]/edit/page.tsx` — idem
- `packages/web/src/components/events/CategoryRow.tsx` (ou nome equivalente) — remove select de `genderMode` da categoria
- `packages/web/src/app/(admin)/events/[id]/page.tsx` ou listagem — remove badge `genderMode` da categoria
- `packages/web/src/hooks/useLiveResults.ts` — tipos sem `categoryId`, mutate por `(gender, position)`
- `packages/web/src/hooks/usePublicResults.ts` — tipo de retorno passa a ser `{ eventGenderMode, released: { MIXED?, MALE?, FEMALE? } }`
- `packages/web/src/components/live/ReleasePanel.tsx` — renderiza ranking geral do evento (1 ou 2 colunas)
- `packages/web/src/components/live/ReleaseSlot.tsx` — props inalteradas exceto remover `categoryId`
- `packages/web/src/components/live/PublicResultsBoard.tsx` — exibe um único bloco de ranking geral (ou split)
- `packages/web/src/app/(live)/live/[eventId]/page.tsx` — passa `eventGenderMode` ao board
- `packages/web/src/app/(admin)/events/[id]/live/page.tsx` — busca `getFullRanking` (novo formato)

**Web — testes:**
- `packages/web/src/components/live/__tests__/PublicResultsBoard.spec.tsx`
- `packages/web/src/components/live/__tests__/ReleasePanel.spec.tsx` (criar)
- `packages/web/src/hooks/__tests__/useLiveResults.spec.tsx` (criar/atualizar)
- `packages/web/src/app/(admin)/events/[id]/live/__tests__/page.spec.tsx`

---

## Tarefa 1: Schema e Migration

**Arquivos:**
- Modificar: `packages/api/prisma/schema.prisma`
- Criar: `packages/api/prisma/migrations/20260507100000_overall_ranking_per_gender/migration.sql`

- [ ] **Passo 1.1: Atualizar `schema.prisma`**

Em `model JudgingEvent`, adicionar antes de `status`:

```prisma
  genderMode      EventGenderMode @default(MIXED) @map("gender_mode")
```

Em `model Category`, remover a linha:

```prisma
  genderMode   CategoryGenderMode @default(MIXED) @map("gender_mode")
```

Em `model ResultRelease`, remover:

```prisma
  categoryId    String
  category   Category     @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  @@index([categoryId, position])
```

Adicionar no lugar:

```prisma
  @@index([eventId, gender, position])
```

Em `model Category`, remover `resultReleases ResultRelease[]`.

No final do arquivo, renomear o enum:

```prisma
enum EventGenderMode {
  MIXED
  MALE_ONLY
  FEMALE_ONLY
  UNISEX_SPLIT
}
```

E remover `enum CategoryGenderMode { ... }`.

- [ ] **Passo 1.2: Criar migration SQL**

```sql
-- Renomeia enum (não há dados em produção; drop+create é seguro)
DROP TYPE IF EXISTS "EventGenderMode";
CREATE TYPE "EventGenderMode" AS ENUM ('MIXED', 'MALE_ONLY', 'FEMALE_ONLY', 'UNISEX_SPLIT');

-- Remove gender_mode de categories
ALTER TABLE "categories" DROP COLUMN "gender_mode";

-- Remove FK e coluna category_id de result_releases
ALTER TABLE "result_releases" DROP CONSTRAINT IF EXISTS "result_releases_categoryId_fkey";
DROP INDEX IF EXISTS "result_releases_categoryId_position_idx";
-- Drop dos partial unique indexes antigos por (eventId, categoryId, gender, position)
DROP INDEX IF EXISTS "result_releases_eventId_categoryId_position_unique_mixed";
DROP INDEX IF EXISTS "result_releases_eventId_categoryId_gender_position_unique";
ALTER TABLE "result_releases" DROP COLUMN "categoryId";

-- Adiciona gender_mode em judging_events
ALTER TABLE "judging_events" ADD COLUMN "gender_mode" "EventGenderMode" NOT NULL DEFAULT 'MIXED';

-- Drop do tipo antigo
DROP TYPE IF EXISTS "CategoryGenderMode";

-- Novos partial unique indexes em result_releases (gender pode ser NULL em MIXED)
CREATE UNIQUE INDEX "result_releases_event_position_mixed_unique"
  ON "result_releases" ("eventId", "position")
  WHERE "gender" IS NULL;
CREATE UNIQUE INDEX "result_releases_event_gender_position_unique"
  ON "result_releases" ("eventId", "gender", "position")
  WHERE "gender" IS NOT NULL;

CREATE INDEX "result_releases_eventId_gender_position_idx"
  ON "result_releases" ("eventId", "gender", "position");
```

- [ ] **Passo 1.3: Aplicar migration**

```bash
cd packages/api && pnpm prisma migrate dev --name overall_ranking_per_gender
```

Esperado: migration aplicada, client regenerado.

- [ ] **Passo 1.4: Commit**

```bash
git add packages/api/prisma
git commit -m "feat(api): move genderMode from Category to Event; remove categoryId from ResultRelease"
```

---

## Tarefa 2: DTOs e service de Evento

**Arquivos:**
- Modificar: `packages/api/src/modules/events/dto/create-event.dto.ts`, `update-event.dto.ts`, `event-response.dto.ts`
- Modificar: `packages/api/src/modules/events/events.service.ts`
- Teste: `packages/api/src/modules/events/__tests__/events.service.spec.ts`

- [ ] **Passo 2.1: Escrever teste falhando**

Adicionar em `events.service.spec.ts`:

```ts
describe('genderMode', () => {
  it('persiste genderMode em create com default MIXED', async () => {
    const created = await service.create(managerId, { ...validInput, genderMode: 'UNISEX_SPLIT' })
    expect(created.genderMode).toBe('UNISEX_SPLIT')
  })

  it('emite audit EVENT_GENDER_MODE_CHANGED em update', async () => {
    await service.update(managerId, eventId, { genderMode: 'FEMALE_ONLY' })
    expect(auditMock.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'EVENT_GENDER_MODE_CHANGED',
    }))
  })
})
```

- [ ] **Passo 2.2: Rodar teste — falha esperada**

```bash
cd packages/api && pnpm test events.service.spec
```

Esperado: FAIL (campo não existe).

- [ ] **Passo 2.3: Adicionar `genderMode` no `CreateEventDto`**

```ts
import { EventGenderMode } from '@prisma/client'
import { IsEnum, IsOptional } from 'class-validator'

// dentro da classe:
@IsOptional()
@IsEnum(EventGenderMode)
genderMode?: EventGenderMode
```

Idem em `UpdateEventDto` (com `@IsOptional`). Em `EventResponseDto`, adicionar `genderMode: EventGenderMode`.

- [ ] **Passo 2.4: Atualizar `events.service.ts`**

Em `create`: passar `genderMode: dto.genderMode ?? 'MIXED'` no `data` do prisma.create.

Em `update`: ler evento atual; se `dto.genderMode && dto.genderMode !== current.genderMode`, registrar audit:

```ts
await this.audit.record({
  actorId: userId,
  actorType: 'USER',
  action: 'EVENT_GENDER_MODE_CHANGED',
  entityType: 'JudgingEvent',
  entityId: id,
  payload: { from: current.genderMode, to: dto.genderMode },
})
```

- [ ] **Passo 2.5: Rodar teste — passa**

```bash
pnpm test events.service.spec
```

Esperado: PASS.

- [ ] **Passo 2.6: Commit**

```bash
git add packages/api/src/modules/events
git commit -m "feat(api): add genderMode to JudgingEvent DTOs and service"
```

---

## Tarefa 3: Limpar `genderMode` de Categoria

**Arquivos:**
- Modificar: `packages/api/src/modules/categories/dto/create-category.dto.ts`, `update-category.dto.ts`, `category-response.dto.ts`
- Modificar: `packages/api/src/modules/categories/categories.service.ts`
- Teste: `packages/api/src/modules/categories/__tests__/categories.service.spec.ts`

- [ ] **Passo 3.1: Atualizar testes existentes**

Em `categories.service.spec.ts`, remover qualquer `expect` sobre `genderMode` e remover teste de `CATEGORY_GENDER_MODE_CHANGED`.

- [ ] **Passo 3.2: Remover `genderMode` dos DTOs e response**

Em `create-category.dto.ts` e `update-category.dto.ts`: deletar import de `CategoryGenderMode` e o campo `genderMode`. Idem em `category-response.dto.ts`.

- [ ] **Passo 3.3: Atualizar `categories.service.ts`**

Remover qualquer leitura/escrita de `genderMode` em `create`, `update`, `findMany`, `findOne`. Remover bloco que registra `CATEGORY_GENDER_MODE_CHANGED`.

- [ ] **Passo 3.4: Rodar testes**

```bash
pnpm test categories.service.spec
```

Esperado: PASS.

- [ ] **Passo 3.5: Commit**

```bash
git add packages/api/src/modules/categories
git commit -m "refactor(api): remove genderMode from Category"
```

---

## Tarefa 4: Novo método `computeOverallRanking` no RankingBuilder

**Arquivos:**
- Modificar: `packages/api/src/modules/reports/ranking-builder.service.ts`
- Teste: `packages/api/src/modules/reports/__tests__/ranking-builder.service.spec.ts` (criar se ausente)

- [ ] **Passo 4.1: Escrever teste falhando**

Em `ranking-builder.service.spec.ts`:

```ts
describe('computeOverallRanking', () => {
  it('MIXED retorna entries únicos ordenados desc por finalScore (top-N do evento)', async () => {
    mockEvent({ id: 'ev1', genderMode: 'MIXED', topN: 3 })
    mockCalculation([
      { participantId: 'p1', finalScore: 9.5, gender: 'MALE' },
      { participantId: 'p2', finalScore: 9.7, gender: 'FEMALE' },
      { participantId: 'p3', finalScore: 8.0, gender: 'MALE' },
      { participantId: 'p4', finalScore: 7.0, gender: 'FEMALE' },
    ])
    const r = await service.computeOverallRanking('ev1', 'mgr1')
    expect(r).toEqual({
      mode: 'MIXED',
      entries: [
        expect.objectContaining({ participantId: 'p2', position: 1 }),
        expect.objectContaining({ participantId: 'p1', position: 2 }),
        expect.objectContaining({ participantId: 'p3', position: 3 }),
      ],
    })
  })

  it('UNISEX_SPLIT retorna male e female separados, cada um até topN', async () => {
    mockEvent({ id: 'ev1', genderMode: 'UNISEX_SPLIT', topN: 2 })
    mockCalculation([
      { participantId: 'm1', finalScore: 9.0, gender: 'MALE' },
      { participantId: 'm2', finalScore: 8.0, gender: 'MALE' },
      { participantId: 'm3', finalScore: 7.0, gender: 'MALE' },
      { participantId: 'f1', finalScore: 9.5, gender: 'FEMALE' },
      { participantId: 'f2', finalScore: 8.5, gender: 'FEMALE' },
    ])
    const r = await service.computeOverallRanking('ev1', 'mgr1')
    expect(r.mode).toBe('UNISEX_SPLIT')
    expect(r.male).toHaveLength(2)
    expect(r.female).toHaveLength(2)
    expect(r.male[0].participantId).toBe('m1')
    expect(r.female[0].participantId).toBe('f1')
  })

  it('MALE_ONLY filtra apenas masculinos', async () => {
    mockEvent({ id: 'ev1', genderMode: 'MALE_ONLY', topN: 5 })
    mockCalculation([
      { participantId: 'm1', finalScore: 9.0, gender: 'MALE' },
      { participantId: 'f1', finalScore: 9.5, gender: 'FEMALE' },
    ])
    const r = await service.computeOverallRanking('ev1', 'mgr1')
    expect(r).toEqual({ mode: 'MALE_ONLY', entries: [expect.objectContaining({ participantId: 'm1', position: 1 })] })
  })

  it('respeita calculationRule R2 do evento (delegado a CalculationService)', async () => {
    mockEvent({ id: 'ev1', genderMode: 'MIXED', topN: 10, calculationRule: 'R2' })
    await service.computeOverallRanking('ev1', 'mgr1')
    expect(calculationServiceMock.calculate).toHaveBeenCalledWith('ev1', 'mgr1')
  })
})
```

- [ ] **Passo 4.2: Rodar — FAIL**

```bash
pnpm test ranking-builder.service.spec
```

- [ ] **Passo 4.3: Implementar `computeOverallRanking`**

Em `ranking-builder.service.ts`, adicionar:

```ts
import { Gender, EventGenderMode } from '@prisma/client'

export type OverallRankingResult =
  | { mode: 'MIXED' | 'MALE_ONLY' | 'FEMALE_ONLY'; entries: RankEntry[] }
  | { mode: 'UNISEX_SPLIT'; male: RankEntry[]; female: RankEntry[] }

async computeOverallRanking(eventId: string, managerId: string): Promise<OverallRankingResult> {
  const event = await this.prisma.judgingEvent.findUniqueOrThrow({
    where: { id: eventId },
    select: { topN: true, genderMode: true },
  })
  const calc = await this.calculationService.calculate(eventId, managerId)
  const participants = await this.prisma.participant.findMany({
    where: { eventId, isAbsent: false },
    select: { id: true, name: true, gender: true },
  })
  const genderMap = new Map(participants.map((p) => [p.id, p.gender]))

  const all: Array<RankEntry & { gender: Gender }> = calc.data.rankings
    .filter((r) => genderMap.has(r.participant.id))
    .map((r) => ({
      participantId: r.participant.id,
      name: r.participant.name,
      totalScore: Number(r.finalScore.toFixed(2)),
      position: 0,
      gender: genderMap.get(r.participant.id)!,
    }))

  const topN = event.topN ?? 10
  const sortAndRank = (arr: typeof all): RankEntry[] =>
    arr
      .slice()
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, topN)
      .map(({ gender: _g, ...e }, i) => ({ ...e, position: i + 1 }))

  switch (event.genderMode as EventGenderMode) {
    case 'MIXED':
      return { mode: 'MIXED', entries: sortAndRank(all) }
    case 'MALE_ONLY':
      return { mode: 'MALE_ONLY', entries: sortAndRank(all.filter((e) => e.gender === Gender.MALE)) }
    case 'FEMALE_ONLY':
      return { mode: 'FEMALE_ONLY', entries: sortAndRank(all.filter((e) => e.gender === Gender.FEMALE)) }
    case 'UNISEX_SPLIT':
      return {
        mode: 'UNISEX_SPLIT',
        male: sortAndRank(all.filter((e) => e.gender === Gender.MALE)),
        female: sortAndRank(all.filter((e) => e.gender === Gender.FEMALE)),
      }
  }
}
```

- [ ] **Passo 4.4: Remover `computeRanking(categoryId)` e `RankingResult` antigo**

Deletar o método `computeRanking(eventId, categoryId, managerId)` e o tipo `RankingResult` baseado em `CategoryGenderMode`. Deletar imports de `CategoryGenderMode`.

- [ ] **Passo 4.5: Atualizar `buildTopNByCategory` (sem split por gênero)**

```ts
async buildTopNByCategory(eventId: string, managerId: string): Promise<Array<{
  categoryId: string
  categoryName: string
  entries: ClassificationEntry[]
}>> {
  const categories = await this.prisma.category.findMany({
    where: { event: { id: eventId } },
    orderBy: { displayOrder: 'asc' },
    select: { id: true, name: true },
  })
  const calc = await this.calculationService.calculate(eventId, managerId)
  const event = await this.prisma.judgingEvent.findUniqueOrThrow({
    where: { id: eventId }, select: { topN: true },
  })
  const topN = event.topN ?? 10
  return categories.map((cat) => {
    const ranked = calc.data.rankings
      .map((r) => {
        const catAvg = this.extractCategoryScores(r.breakdown)[cat.name]
        return catAvg == null ? null : {
          participantId: r.participant.id,
          participantName: r.participant.name,
          finalScore: catAvg,
          scoresByCategory: { [cat.name]: catAvg },
          isAbsent: false,
          position: 0,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x != null)
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, topN)
      .map((e, i) => ({ ...e, position: i + 1 }))
    return { categoryId: cat.id, categoryName: cat.name, entries: ranked }
  })
}
```

- [ ] **Passo 4.6: Rodar — PASS**

```bash
pnpm test ranking-builder.service.spec
```

- [ ] **Passo 4.7: Commit**

```bash
git add packages/api/src/modules/reports
git commit -m "feat(api): add RankingBuilder.computeOverallRanking; drop per-category split"
```

---

## Tarefa 5: ResultReleases service e DTO

**Arquivos:**
- Modificar: `packages/api/src/modules/result-releases/dto/create-result-release.dto.ts`
- Modificar: `packages/api/src/modules/result-releases/result-releases.service.ts`
- Modificar: `packages/api/src/modules/result-releases/result-releases.controller.ts`
- Modificar: `packages/api/src/modules/result-releases/result-releases.gateway.ts`
- Teste: `packages/api/src/modules/result-releases/__tests__/result-releases.service.spec.ts`

- [ ] **Passo 5.1: Escrever testes falhando**

Substituir testes existentes por:

```ts
describe('release', () => {
  it('libera posição do ranking geral em evento MIXED', async () => {
    mockEvent({ status: 'FINISHED', genderMode: 'MIXED' })
    mockOverallRanking({ mode: 'MIXED', entries: [{ participantId: 'p1', name: 'A', totalScore: 9, position: 1 }] })
    const created = await service.release('ev1', 'u1', { position: 1 })
    expect(created).toMatchObject({ eventId: 'ev1', categoryId: null, gender: null, position: 1 })
  })

  it('libera split MALE em evento UNISEX_SPLIT', async () => {
    mockEvent({ status: 'FINISHED', genderMode: 'UNISEX_SPLIT' })
    mockOverallRanking({
      mode: 'UNISEX_SPLIT',
      male: [{ participantId: 'm1', name: 'M', totalScore: 9, position: 1 }],
      female: [],
    })
    const created = await service.release('ev1', 'u1', { gender: 'MALE', position: 1 })
    expect(created.gender).toBe('MALE')
  })

  it('rejeita gender em evento MIXED', async () => {
    mockEvent({ status: 'FINISHED', genderMode: 'MIXED' })
    await expect(service.release('ev1', 'u1', { gender: 'MALE', position: 1 }))
      .rejects.toThrow(/MIXED.*não aceita gênero/)
  })

  it('exige gender em UNISEX_SPLIT', async () => {
    mockEvent({ status: 'FINISHED', genderMode: 'UNISEX_SPLIT' })
    await expect(service.release('ev1', 'u1', { position: 1 }))
      .rejects.toThrow(/UNISEX_SPLIT.*exige gênero/)
  })

  it('valida posição existe no ranking geral', async () => {
    mockEvent({ status: 'FINISHED', genderMode: 'MIXED' })
    mockOverallRanking({ mode: 'MIXED', entries: [] })
    await expect(service.release('ev1', 'u1', { position: 1 })).rejects.toThrow(/Posição 1/)
  })
})

describe('getFullRanking', () => {
  it('retorna ranking geral do evento', async () => {
    mockEvent({ genderMode: 'UNISEX_SPLIT' })
    mockOverallRanking({ mode: 'UNISEX_SPLIT', male: [], female: [] })
    const r = await service.getFullRanking('ev1')
    expect(r).toEqual({ genderMode: 'UNISEX_SPLIT', ranking: { mode: 'UNISEX_SPLIT', male: [], female: [] } })
  })
})
```

- [ ] **Passo 5.2: Rodar — FAIL**

```bash
pnpm test result-releases.service.spec
```

- [ ] **Passo 5.3: Atualizar `CreateResultReleaseDto`**

```ts
import { Gender } from '@prisma/client'
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator'

export class CreateResultReleaseDto {
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender

  @IsInt()
  @Min(1)
  position!: number
}
```

- [ ] **Passo 5.4: Reescrever `result-releases.service.ts`**

```ts
import { BadRequestException, Injectable, Inject } from '@nestjs/common'
import { Gender, EventGenderMode, EventStatus } from '@prisma/client'
import { PrismaService } from '../../config/prisma.service'
import { AuditService } from '../audit/audit.service'
import { RankingBuilderService, OverallRankingResult } from '../reports/ranking-builder.service'
import { CreateResultReleaseDto } from './dto/create-result-release.dto'

@Injectable()
export class ResultReleasesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(RankingBuilderService) private readonly rankingBuilder: RankingBuilderService,
  ) {}

  async release(eventId: string, userId: string, dto: CreateResultReleaseDto) {
    const event = await this.prisma.judgingEvent.findUniqueOrThrow({ where: { id: eventId } })
    if (event.status !== EventStatus.FINISHED) {
      throw new BadRequestException('Evento precisa estar encerrado para liberar resultados.')
    }
    const expectedGender = this.resolveGender(event.genderMode as EventGenderMode, dto.gender ?? null)
    const ranking = await this.rankingBuilder.computeOverallRanking(eventId, event.managerId)
    const entries = this.entriesFor(ranking, expectedGender)
    const match = entries.find((e) => e.position === dto.position)
    if (!match) throw new BadRequestException(`Posição ${dto.position} não disponível no ranking.`)

    const created = await this.prisma.resultRelease.create({
      data: { eventId, gender: expectedGender, position: dto.position, releasedById: userId },
    })
    await this.audit.record({
      actorId: userId,
      actorType: 'USER',
      action: 'RESULT_RELEASED',
      entityType: 'JudgingEvent',
      entityId: eventId,
      payload: { gender: expectedGender, position: dto.position, participantId: match.participantId },
    })
    return created
  }

  async revert(eventId: string, userId: string, releaseId: string) {
    const release = await this.prisma.resultRelease.findUniqueOrThrow({ where: { id: releaseId } })
    if (release.eventId !== eventId) throw new BadRequestException('Release não pertence ao evento.')
    await this.prisma.resultRelease.delete({ where: { id: releaseId } })
    await this.audit.record({
      actorId: userId,
      actorType: 'USER',
      action: 'RESULT_UNRELEASED',
      entityType: 'JudgingEvent',
      entityId: eventId,
      payload: { gender: release.gender, position: release.position },
    })
    return { id: releaseId }
  }

  async getFullRanking(eventId: string) {
    const event = await this.prisma.judgingEvent.findUniqueOrThrow({
      where: { id: eventId },
      select: { managerId: true, genderMode: true },
    })
    const ranking = await this.rankingBuilder.computeOverallRanking(eventId, event.managerId)
    return { genderMode: event.genderMode, ranking }
  }

  async list(eventId: string) {
    return this.prisma.resultRelease.findMany({
      where: { eventId },
      orderBy: [{ gender: 'asc' }, { position: 'asc' }],
    })
  }

  private resolveGender(mode: EventGenderMode, provided: Gender | null): Gender | null {
    switch (mode) {
      case 'MIXED':
        if (provided != null) throw new BadRequestException('Evento MIXED não aceita gênero.')
        return null
      case 'MALE_ONLY':
        if (provided !== Gender.MALE) throw new BadRequestException('Evento MALE_ONLY exige gender=MALE.')
        return Gender.MALE
      case 'FEMALE_ONLY':
        if (provided !== Gender.FEMALE) throw new BadRequestException('Evento FEMALE_ONLY exige gender=FEMALE.')
        return Gender.FEMALE
      case 'UNISEX_SPLIT':
        if (provided !== Gender.MALE && provided !== Gender.FEMALE) {
          throw new BadRequestException('Evento UNISEX_SPLIT exige gênero MALE ou FEMALE.')
        }
        return provided
    }
  }

  private entriesFor(ranking: OverallRankingResult, gender: Gender | null) {
    if (ranking.mode === 'UNISEX_SPLIT') return gender === Gender.MALE ? ranking.male : ranking.female
    return ranking.entries
  }
}
```

- [ ] **Passo 5.5: Atualizar gateway**

Em `result-releases.gateway.ts`, payloads emitidos `result:released` / `result:unreleased` agora têm `{ eventId, gender, position }` (sem `categoryId`).

- [ ] **Passo 5.6: Atualizar controller**

`POST /events/:id/results/releases` agora aceita `{ gender?, position }`. Sem mudança de rota.

- [ ] **Passo 5.7: Rodar testes — PASS**

```bash
pnpm test result-releases.service.spec
```

- [ ] **Passo 5.8: Commit**

```bash
git add packages/api/src/modules/result-releases
git commit -m "feat(api): release positions over event-level overall ranking"
```

---

## Tarefa 6: Endpoint público `GET /public/events/:id/results`

**Arquivos:**
- Modificar: `packages/api/src/modules/public-events/public-events.controller.ts` (ou onde estiver — buscar por `'public/events'` + `'results'`)
- Teste: spec do controller correspondente

- [ ] **Passo 6.1: Identificar arquivo**

```bash
grep -rn "public/events" packages/api/src --include="*.ts" -l
grep -rn "results/releases" packages/api/src --include="*.ts" -l
```

- [ ] **Passo 6.2: Escrever teste falhando**

No spec do controller público, adicionar:

```ts
it('retorna released agrupado por gênero no nível do evento', async () => {
  mockEvent({ id: 'ev1', genderMode: 'UNISEX_SPLIT' })
  mockOverallRanking({
    mode: 'UNISEX_SPLIT',
    male: [{ participantId: 'm1', name: 'M', totalScore: 9, position: 1 }],
    female: [{ participantId: 'f1', name: 'F', totalScore: 9.5, position: 1 }],
  })
  mockReleases([
    { gender: 'MALE', position: 1 },
    { gender: 'FEMALE', position: 1 },
  ])
  const r = await controller.getResults('ev1')
  expect(r).toEqual({
    eventGenderMode: 'UNISEX_SPLIT',
    released: {
      MALE: [{ position: 1, participantId: 'm1', name: 'M', totalScore: 9 }],
      FEMALE: [{ position: 1, participantId: 'f1', name: 'F', totalScore: 9.5 }],
    },
  })
})
```

- [ ] **Passo 6.3: Rodar — FAIL**

- [ ] **Passo 6.4: Implementar**

Lógica: ler `event.genderMode`, computar `OverallRankingResult` via builder, ler `resultReleases` do evento, intersectar — para cada release `(gender, position)`, buscar entry correspondente e popular `released[gender ?? 'MIXED']`.

```ts
async getResults(eventId: string) {
  const event = await this.prisma.judgingEvent.findUniqueOrThrow({
    where: { id: eventId },
    select: { managerId: true, genderMode: true },
  })
  const ranking = await this.rankingBuilder.computeOverallRanking(eventId, event.managerId)
  const releases = await this.prisma.resultRelease.findMany({ where: { eventId } })

  const released: { MIXED?: any[]; MALE?: any[]; FEMALE?: any[] } = {}
  const pickEntry = (gender: Gender | null, position: number) => {
    if (ranking.mode === 'UNISEX_SPLIT') {
      const arr = gender === Gender.MALE ? ranking.male : ranking.female
      return arr.find((e) => e.position === position)
    }
    return ranking.entries.find((e) => e.position === position)
  }
  for (const r of releases) {
    const key = r.gender ?? 'MIXED'
    const entry = pickEntry(r.gender, r.position)
    if (!entry) continue
    ;(released[key] ??= []).push({
      position: entry.position,
      participantId: entry.participantId,
      name: entry.name,
      totalScore: entry.totalScore,
    })
  }
  return { eventGenderMode: event.genderMode, released }
}
```

- [ ] **Passo 6.5: Rodar — PASS**

- [ ] **Passo 6.6: Commit**

```bash
git add packages/api/src/modules/public-events
git commit -m "feat(api): public results endpoint returns event-level released ranking"
```

---

## Tarefa 7: ReportsProcessor e Certificates

**Arquivos:**
- Modificar: `packages/api/src/modules/reports/reports.processor.ts`
- Modificar: `packages/api/src/modules/certificates/certificates.service.ts` (se referenciar `genderMode` da categoria)
- Teste: `packages/api/src/modules/reports/__tests__/reports.processor.spec.ts`
- Teste: `packages/api/src/modules/certificates/__tests__/certificates.service.spec.ts`

- [ ] **Passo 7.1: Atualizar testes existentes**

Em `reports.processor.spec.ts`, atualizar mocks de `buildTopNByCategory` para retornar `{ categoryId, categoryName, entries }` (sem `mixed/male/female`).

Em `certificates.service.spec.ts`, atualizar mock para o evento (não a categoria) ter `genderMode`. Se certificados precisam dividir por gênero, usar `computeOverallRanking` em vez de `computeRanking` por categoria.

- [ ] **Passo 7.2: Atualizar `reports.processor.ts`**

Onde consumia `cat.mixed/male/female`, passar a iterar `cat.entries`. Manter geração de TOP_N por categoria como ranking simples (sem split de gênero).

Para o relatório GENERAL, usar `computeOverallRanking` (entrega ranking geral do evento, com split conforme `event.genderMode`).

- [ ] **Passo 7.3: Atualizar `certificates.service.ts`**

Trocar chamada a `computeRanking(eventId, categoryId, managerId)` por `computeOverallRanking(eventId, managerId)`. Iterar `entries` ou `male/female` conforme `mode`.

- [ ] **Passo 7.4: Rodar testes**

```bash
pnpm test reports.processor.spec certificates.service.spec
```

Esperado: PASS.

- [ ] **Passo 7.5: Commit**

```bash
git add packages/api/src/modules/reports packages/api/src/modules/certificates
git commit -m "refactor(api): reports and certificates use overall ranking"
```

---

## Tarefa 8: Seeds

**Arquivos:**
- Modificar: `packages/api/src/seed/seed.ts`

- [ ] **Passo 8.1: Atualizar seed**

Em cada `judgingEvent.create`, adicionar `genderMode: 'UNISEX_SPLIT'` (ou variar entre eventos). Em cada `category.create`, remover `genderMode`.

- [ ] **Passo 8.2: Rodar seed**

```bash
cd packages/api && pnpm seed
```

Esperado: sem erros, dados criados.

- [ ] **Passo 8.3: Commit**

```bash
git add packages/api/src/seed
git commit -m "chore(api): seed sets genderMode on event, removes from category"
```

---

## Tarefa 9: Web — Form de evento ganha `genderMode`, categoria perde

**Arquivos:**
- Identificar formulários de evento (new + edit) e o componente de linha de categoria
- Modificar shared types se houver re-export

- [ ] **Passo 9.1: Localizar arquivos**

```bash
grep -rn "genderMode" packages/web/src --include="*.tsx" --include="*.ts" -l
```

- [ ] **Passo 9.2: Adicionar Select no form de evento**

No form de evento (new + edit), antes do bloco de categorias, adicionar:

```tsx
<div>
  <label className="block text-sm font-medium text-secondary-700">Modo de gênero</label>
  <select
    value={form.genderMode ?? 'MIXED'}
    onChange={(e) => setForm({ ...form, genderMode: e.target.value as EventGenderMode })}
    className="mt-1 block w-full rounded border-secondary-300"
  >
    <option value="MIXED">Misto</option>
    <option value="MALE_ONLY">Apenas masculino</option>
    <option value="FEMALE_ONLY">Apenas feminino</option>
    <option value="UNISEX_SPLIT">Unissex (rankings separados)</option>
  </select>
</div>
```

E enviar `genderMode` no `POST` / `PATCH` do evento.

- [ ] **Passo 9.3: Remover Select de categoria**

No componente de linha de categoria, remover o `<select>` de `genderMode` e qualquer prop relacionada.

- [ ] **Passo 9.4: Remover badge `genderMode` da listagem de categorias**

Localizar `genderMode` em listagens (`CategoryList`, página `[id]/page.tsx`) e remover.

- [ ] **Passo 9.5: Rodar build/typecheck**

```bash
cd packages/web && pnpm typecheck
```

- [ ] **Passo 9.6: Commit**

```bash
git add packages/web/src
git commit -m "feat(web): genderMode moves from category form to event form"
```

---

## Tarefa 10: Web — Hooks `useLiveResults` e `usePublicResults`

**Arquivos:**
- Modificar: `packages/web/src/hooks/useLiveResults.ts`
- Modificar: `packages/web/src/hooks/usePublicResults.ts`

- [ ] **Passo 10.1: Atualizar `useLiveResults`**

Tipo de release agora `{ id, eventId, gender: 'MALE'|'FEMALE'|null, position }`. Mutate `release` recebe `{ gender, position }` (sem categoryId). Endpoint POST `/events/:id/results/releases` com novo body.

```ts
export function useLiveResults(eventId: string) {
  const releases = useQuery({ queryKey: ['releases', eventId], queryFn: () => api.get(...) })
  const release = useMutation({
    mutationFn: (body: { gender: 'MALE'|'FEMALE'|null; position: number }) =>
      api.post(`/events/${eventId}/results/releases`, {
        gender: body.gender ?? undefined,
        position: body.position,
      }),
  })
  // ...
}
```

Os tipos do `getFullRanking` agora retornam `{ genderMode, ranking: OverallRankingResult }` em vez de `{ categories: [...] }`.

- [ ] **Passo 10.2: Atualizar `usePublicResults`**

Tipo de retorno:

```ts
export interface ReleasedEntry { position: number; participantId: string; name: string; totalScore: number }
export interface PublicResults {
  eventGenderMode: 'MIXED'|'MALE_ONLY'|'FEMALE_ONLY'|'UNISEX_SPLIT'
  released: { MIXED?: ReleasedEntry[]; MALE?: ReleasedEntry[]; FEMALE?: ReleasedEntry[] }
}
```

Socket events `result:released` / `result:unreleased` agora carregam `{ eventId, gender, position }` (sem categoryId) — o handler invalida só pela `eventId`.

- [ ] **Passo 10.3: Commit**

```bash
git add packages/web/src/hooks
git commit -m "refactor(web): hooks consume event-level ranking shape"
```

---

## Tarefa 11: Web — `ReleasePanel` e `PublicResultsBoard`

**Arquivos:**
- Modificar: `packages/web/src/components/live/ReleasePanel.tsx`
- Modificar: `packages/web/src/components/live/ReleaseSlot.tsx`
- Modificar: `packages/web/src/components/live/PublicResultsBoard.tsx`
- Teste: `packages/web/src/components/live/__tests__/PublicResultsBoard.spec.tsx`

- [ ] **Passo 11.1: Reescrever `ReleasePanel`**

```tsx
'use client'
import { useLiveResults } from '@/hooks/useLiveResults'
import { ReleaseSlot } from './ReleaseSlot'

interface RankEntry { participantId: string; name: string; totalScore: number; position: number }
interface OverallRanking {
  mode: 'MIXED'|'MALE_ONLY'|'FEMALE_ONLY'|'UNISEX_SPLIT'
  entries?: RankEntry[]; male?: RankEntry[]; female?: RankEntry[]
}

interface Props { eventId: string; ranking: OverallRanking }

export function ReleasePanel({ eventId, ranking }: Props) {
  const { releases, release, revert } = useLiveResults(eventId)

  const renderColumn = (gender: 'MALE'|'FEMALE'|null, entries: RankEntry[]) => {
    const sorted = [...entries].sort((a, b) => b.position - a.position)
    const maxPosition = entries.length ? Math.max(...entries.map((e) => e.position)) : 0
    return (
      <div className="space-y-2">
        {sorted.map((entry) => {
          const rel = releases.data?.find((r) => r.gender === gender && r.position === entry.position)
          const isLast = entry.position === maxPosition
          const prevReleased = isLast || releases.data?.some(
            (r) => r.gender === gender && r.position === entry.position + 1,
          )
          return (
            <ReleaseSlot
              key={entry.position}
              position={entry.position}
              gender={gender}
              released={rel ? { id: rel.id, participantName: entry.name, score: entry.totalScore } : undefined}
              prevReleased={!!prevReleased}
              isPending={release.isPending || revert.isPending}
              onRelease={() => release.mutate({ gender, position: entry.position })}
              onRevert={() => rel && revert.mutate(rel.id)}
            />
          )
        })}
      </div>
    )
  }

  return (
    <section className="mt-6 space-y-4">
      <h2 className="text-lg font-bold text-secondary-900">Liberação de Resultados</h2>
      <div className="rounded-lg border border-secondary-200 bg-white p-4 shadow-sm">
        {ranking.mode === 'UNISEX_SPLIT' ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-blue-600 uppercase">Masculino</p>
              {renderColumn('MALE', ranking.male ?? [])}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-pink-600 uppercase">Feminino</p>
              {renderColumn('FEMALE', ranking.female ?? [])}
            </div>
          </div>
        ) : ranking.mode === 'MALE_ONLY' ? (
          renderColumn('MALE', ranking.entries ?? [])
        ) : ranking.mode === 'FEMALE_ONLY' ? (
          renderColumn('FEMALE', ranking.entries ?? [])
        ) : (
          renderColumn(null, ranking.entries ?? [])
        )}
      </div>
    </section>
  )
}
```

- [ ] **Passo 11.2: Ajustar `ReleaseSlot`**

Remover qualquer prop `categoryId`. O componente já aceita `gender, position, released, prevReleased, onRelease, onRevert`.

- [ ] **Passo 11.3: Reescrever `PublicResultsBoard`**

```tsx
import { Trophy, Star } from 'lucide-react'
import type { PublicResults, ReleasedEntry } from '@/hooks/usePublicResults'

interface Props { eventName: string; results: PublicResults }

// EntryCard e RankingColumn permanecem exatamente como hoje (mesmo JSX/estilos).

export function PublicResultsBoard({ eventName, results }: Props) {
  const { eventGenderMode, released } = results
  const totalReleased =
    (released.MIXED?.length ?? 0) + (released.MALE?.length ?? 0) + (released.FEMALE?.length ?? 0)

  if (totalReleased === 0) {
    // mesmo fallback "Aguardando divulgação" de hoje
  }

  return (
    <div className="min-h-screen px-8 py-12" style={{ background: 'linear-gradient(160deg, #fffdf5 0%, #fef9e7 100%)' }}>
      {/* mesmo header com Trophy + eventName */}
      <div className="mx-auto max-w-5xl">
        {eventGenderMode === 'UNISEX_SPLIT' ? (
          <div className="grid grid-cols-2 gap-8">
            <RankingColumn entries={released.MALE} label="Masculino" />
            <RankingColumn entries={released.FEMALE} label="Feminino" />
          </div>
        ) : eventGenderMode === 'MALE_ONLY' ? (
          <RankingColumn entries={released.MALE} label="Masculino" />
        ) : eventGenderMode === 'FEMALE_ONLY' ? (
          <RankingColumn entries={released.FEMALE} label="Feminino" />
        ) : (
          <RankingColumn entries={released.MIXED} />
        )}
      </div>
    </div>
  )
}
```

(Manter `EntryCard` e `RankingColumn` idênticos aos atuais — só o nível de agrupamento mudou.)

- [ ] **Passo 11.4: Atualizar testes do `PublicResultsBoard`**

```tsx
it('renderiza split em UNISEX_SPLIT', () => {
  render(<PublicResultsBoard eventName="X" results={{
    eventGenderMode: 'UNISEX_SPLIT',
    released: {
      MALE: [{ position: 1, participantId: 'm', name: 'João', totalScore: 9 }],
      FEMALE: [{ position: 1, participantId: 'f', name: 'Maria', totalScore: 9.5 }],
    },
  }}/>)
  expect(screen.getByText('Masculino')).toBeInTheDocument()
  expect(screen.getByText('Feminino')).toBeInTheDocument()
})

it('renderiza coluna única em MIXED', () => {
  render(<PublicResultsBoard eventName="X" results={{
    eventGenderMode: 'MIXED',
    released: { MIXED: [{ position: 1, participantId: 'p', name: 'Z', totalScore: 9 }] },
  }}/>)
  expect(screen.queryByText('Masculino')).not.toBeInTheDocument()
})
```

- [ ] **Passo 11.5: Rodar testes**

```bash
cd packages/web && pnpm test PublicResultsBoard
```

Esperado: PASS.

- [ ] **Passo 11.6: Commit**

```bash
git add packages/web/src/components/live
git commit -m "refactor(web): release panel and public board operate on event ranking"
```

---

## Tarefa 12: Páginas live admin e pública

**Arquivos:**
- Modificar: `packages/web/src/app/(admin)/events/[id]/live/page.tsx`
- Modificar: `packages/web/src/app/(live)/live/[eventId]/page.tsx`
- Teste: `packages/web/src/app/(admin)/events/[id]/live/__tests__/page.spec.tsx`

- [ ] **Passo 12.1: Atualizar admin live page**

Hook `useFullRanking(eventId)` agora retorna `{ genderMode, ranking }`. Passar `ranking` direto ao `<ReleasePanel eventId={eventId} ranking={data.ranking}/>`.

- [ ] **Passo 12.2: Atualizar página pública live**

```tsx
const { data: publicResults } = usePublicResults(eventId)
// ...
if (status === 'FINISHED') {
  return <PublicResultsBoard eventName={eventInfo?.name ?? ''} results={publicResults ?? { eventGenderMode: 'MIXED', released: {} }} />
}
```

- [ ] **Passo 12.3: Atualizar testes**

Em `live/__tests__/page.spec.tsx`, atualizar mock do `useFullRanking` para devolver `{ genderMode: 'UNISEX_SPLIT', ranking: { mode: 'UNISEX_SPLIT', male: [], female: [] } }`.

- [ ] **Passo 12.4: Rodar testes**

```bash
pnpm test
```

Esperado: PASS no Web inteiro.

- [ ] **Passo 12.5: Commit**

```bash
git add packages/web/src/app
git commit -m "feat(web): live pages render event-level overall ranking"
```

---

## Tarefa 13: Verificação final e E2E manual

- [ ] **Passo 13.1: Rodar suite completa**

```bash
pnpm -w test
pnpm -w typecheck
pnpm -w build
```

Esperado: tudo verde.

- [ ] **Passo 13.2: Atualizar `ESTADO_IMPLEMENTACAO.md`**

Adicionar seção descrevendo a refatoração: liberação agora é por evento (não por categoria), `Category.genderMode` removido, `JudgingEvent.genderMode` adicionado.

- [ ] **Passo 13.3: Roteiro manual**

1. Criar evento `genderMode=UNISEX_SPLIT` com 2 categorias e 4 participantes (2 MALE, 2 FEMALE)
2. Cadastrar jurados, abrir IN_PROGRESS, dar notas em todas categorias
3. Finalizar evento (FINISHED)
4. Painel admin mostra 2 colunas (Masculino/Feminino) com top-N do ranking geral
5. Liberar 1º masc → tela pública aparece 1º masc; liberar 1º fem → idem
6. Reverter um → some da pública
7. Criar evento `genderMode=MIXED` → painel mostra coluna única, libera misto

- [ ] **Passo 13.4: Commit final**

```bash
git add ESTADO_IMPLEMENTACAO.md
git commit -m "docs: update implementation state — overall ranking per gender"
```

---

## Notas

1. **Sem dados em produção** — migration drop direto seguro.
2. **`R2` continua funcionando** — `CalculationService.calculate()` já aplica regra do evento; `computeOverallRanking` só consome `finalScore`.
3. **`buildTopNByCategory`** — mantido para relatório TOP_N por categoria, mas sem split de gênero (categoria é dimensão, não ranking final).
4. **Top-N** — campo `JudgingEvent.topN` reutilizado (mesmo lugar de antes).
5. **`@judging/shared`** — se `CategoryGenderMode` é re-exportado, renomear para `EventGenderMode` (export único).
