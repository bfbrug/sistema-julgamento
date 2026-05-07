# Plano de Implementação — Distinção de Gênero e Liberação Controlada de Resultados

> **Para agentes executores:** SUB-SKILL OBRIGATÓRIA: Use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano tarefa-a-tarefa. Os passos usam sintaxe de checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** Adicionar distinção de gênero por categoria nos eventos e permitir que o gestor libere os resultados na tela live posição-por-posição após o encerramento do evento.

**Arquitetura:** Migration única adiciona enums `Gender` e `CategoryGenderMode`, coluna `gender` em Participant, coluna `genderMode` em Category e nova tabela `ResultRelease`. API NestJS ganha endpoints para liberação/reversão e um gateway WebSocket público que emite eventos. Frontend Next.js adiciona campos nos forms de evento/participante, painel de liberação na tela admin live e revelação progressiva animada na tela live pública.

**Stack:** NestJS, Prisma, PostgreSQL, Socket.IO, Next.js (App Router), TanStack Query, Tailwind, Vitest/Jest, Testing Library.

**Referência:** [docs/superpowers/specs/2026-05-07-distincao-genero-e-liberacao-resultados-design.md](../specs/2026-05-07-distincao-genero-e-liberacao-resultados-design.md)

---

## Tarefa 1 — Schema e Migration

**Arquivos:**
- Modificar: `packages/api/prisma/schema.prisma`
- Criar: `packages/api/prisma/migrations/<timestamp>_add_gender_and_result_release/migration.sql` (gerado pelo Prisma)

- [ ] **Passo 1: Adicionar enums e modificar models em `schema.prisma`**

Editar `packages/api/prisma/schema.prisma`:

Adicionar enums (junto aos demais enums no fim do arquivo):

```prisma
enum Gender {
  MALE
  FEMALE
}

enum CategoryGenderMode {
  MIXED
  MALE_ONLY
  FEMALE_ONLY
  UNISEX_SPLIT
}
```

Em `model Participant`, adicionar campo `gender` após `name`:

```prisma
  gender             Gender
```

Adicionar índice composto:

```prisma
  @@index([eventId, gender])
```

Em `model Category`, adicionar campo `genderMode` após `displayOrder`:

```prisma
  genderMode   CategoryGenderMode @default(MIXED)
```

Adicionar novo model `ResultRelease` (depois de `TiebreakerConfig`):

```prisma
model ResultRelease {
  id            String   @id @default(uuid())
  eventId       String
  categoryId    String
  gender        Gender?
  position      Int
  releasedAt    DateTime @default(now())
  releasedById  String

  event      JudgingEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  category   Category     @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  releasedBy User         @relation(fields: [releasedById], references: [id])

  @@unique([categoryId, gender, position])
  @@index([eventId])
  @@map("result_releases")
}
```

Adicionar relações inversas:
- Em `model JudgingEvent`: `resultReleases   ResultRelease[]`
- Em `model Category`:     `resultReleases   ResultRelease[]`
- Em `model User`:         `resultReleases   ResultRelease[]`

- [ ] **Passo 2: Gerar migration**

Rodar:
```bash
cd packages/api && npx prisma migrate dev --name add_gender_and_result_release
```

Esperado: prisma cria arquivo `migration.sql`, aplica no banco de dev e regenera o client. Como o banco de dev não tem dados reais, NOT NULL em `gender` é aceito direto.

- [ ] **Passo 3: Verificar client regenerado**

Rodar:
```bash
cd packages/api && npx tsc --noEmit
```

Esperado: erros de tipo nos serviços/controllers que usam `Participant` e `Category` sem `gender`/`genderMode`. Isso é esperado — serão corrigidos nas próximas tarefas. Anotar a lista de erros para guiar as próximas tarefas.

- [ ] **Passo 4: Commit**

```bash
git add packages/api/prisma/schema.prisma packages/api/prisma/migrations
git commit -m "feat(api): add gender, categoryGenderMode and result_releases schema"
```

---

## Tarefa 2 — DTOs e Validações de Participante e Categoria

**Arquivos:**
- Modificar: `packages/api/src/modules/participants/dto/create-participant.dto.ts`
- Modificar: `packages/api/src/modules/participants/dto/update-participant.dto.ts`
- Modificar: `packages/api/src/modules/participants/dto/bulk-create-participants.dto.ts`
- Modificar: `packages/api/src/modules/categories/dto/create-category.dto.ts` (caminho real pode variar — confirmar antes)
- Modificar: `packages/api/src/modules/categories/dto/update-category.dto.ts`

- [ ] **Passo 1: Localizar arquivos exatos**

Rodar:
```bash
ls packages/api/src/modules/participants/dto
ls packages/api/src/modules/categories || ls packages/api/src/modules/events
```

Anotar caminhos exatos. Se categorias forem criadas dentro de events, ajustar caminhos.

- [ ] **Passo 2: Adicionar `gender` no `CreateParticipantDto`**

Editar arquivo de `CreateParticipantDto`:

```ts
import { IsEnum } from 'class-validator';
import { Gender } from '@prisma/client';

// dentro da classe:
@IsEnum(Gender, { message: 'Gênero inválido. Use MALE ou FEMALE.' })
gender!: Gender;
```

Repetir em `BulkCreateParticipantsDto.items[]` (campo `gender` no DTO de item) e tornar opcional em `UpdateParticipantDto` (`@IsOptional()`).

- [ ] **Passo 3: Adicionar `genderMode` no `CreateCategoryDto`**

Editar:

```ts
import { IsEnum, IsOptional } from 'class-validator';
import { CategoryGenderMode } from '@prisma/client';

// dentro da classe:
@IsOptional()
@IsEnum(CategoryGenderMode, { message: 'Modo de gênero inválido.' })
genderMode?: CategoryGenderMode;
```

Repetir em `UpdateCategoryDto`.

- [ ] **Passo 4: Atualizar service de participantes para persistir `gender`**

Localizar `participants.service.ts`. Em `create`, `bulkCreate` e `update`, repassar `gender` para `prisma.participant.create/update/createMany`.

Em `bulkCreate`, garantir que `gender` está em cada item criado.

- [ ] **Passo 5: Atualizar service de categorias para persistir `genderMode`**

Localizar service de categorias. Em `create` e `update`, repassar `genderMode` (default `MIXED` se ausente).

- [ ] **Passo 6: Escrever teste — gender obrigatório no create**

Em `participants.service.spec.ts`, adicionar:

```ts
it('cria participante com gender', async () => {
  const result = await service.create(eventId, {
    name: 'João',
    presentationOrder: 1,
    gender: 'MALE',
  });
  expect(result.gender).toBe('MALE');
});

it('rejeita gender inválido', async () => {
  await expect(
    service.create(eventId, {
      name: 'João',
      presentationOrder: 1,
      gender: 'OTHER' as any,
    }),
  ).rejects.toThrow();
});
```

- [ ] **Passo 7: Escrever teste — `genderMode` default e custom em categoria**

Em `categories.service.spec.ts` (criar se não existir):

```ts
it('cria categoria com genderMode default MIXED', async () => {
  const cat = await service.create(eventId, { name: 'Geral', displayOrder: 1 });
  expect(cat.genderMode).toBe('MIXED');
});

it('cria categoria com genderMode UNISEX_SPLIT', async () => {
  const cat = await service.create(eventId, {
    name: 'Geral',
    displayOrder: 1,
    genderMode: 'UNISEX_SPLIT',
  });
  expect(cat.genderMode).toBe('UNISEX_SPLIT');
});
```

- [ ] **Passo 8: Rodar testes**

```bash
cd packages/api && npm test -- participants.service categories.service
```

Esperado: todos passam.

- [ ] **Passo 9: Commit**

```bash
git add packages/api/src/modules
git commit -m "feat(api): add gender to participants and genderMode to categories"
```

---

## Tarefa 3 — Import CSV/XLSX com Coluna de Gênero

**Arquivos:**
- Modificar: parser de import (localizar via `grep -r "papaparse\|xlsx" packages/api/src`)
- Modificar: `packages/api/src/modules/participants/__tests__/bulk-create.spec.ts`

- [ ] **Passo 1: Localizar parser**

Rodar:
```bash
grep -rln "papaparse\|xlsx\|bulkCreate" packages/api/src/modules/participants
```

Anotar arquivo do parser/normalizador.

- [ ] **Passo 2: Implementar normalização de valor de gênero**

Em arquivo de utilitário do parser (ou criar `packages/api/src/modules/participants/utils/normalize-gender.ts`):

```ts
import { Gender } from '@prisma/client';

const MALE_VALUES = new Set(['m', 'masculino', 'male']);
const FEMALE_VALUES = new Set(['f', 'feminino', 'female']);

export function normalizeGender(raw: string | undefined | null): Gender {
  if (raw == null) {
    throw new Error('gênero ausente');
  }
  const v = String(raw).trim().toLowerCase();
  if (MALE_VALUES.has(v)) return 'MALE';
  if (FEMALE_VALUES.has(v)) return 'FEMALE';
  throw new Error(`gênero inválido "${raw}"`);
}
```

- [ ] **Passo 3: Reconhecer coluna `genero`/`gender`**

No parser principal, depois de detectar headers, procurar header com nome `genero` ou `gender` (case-insensitive). Para cada linha, chamar `normalizeGender(row[header])`. Se lançar, acumular em `errors[]` com `linha N: <mensagem>`.

- [ ] **Passo 4: Escrever testes do normalizador**

Criar `packages/api/src/modules/participants/utils/__tests__/normalize-gender.spec.ts`:

```ts
import { normalizeGender } from '../normalize-gender';

describe('normalizeGender', () => {
  it.each([['M', 'MALE'], ['m', 'MALE'], ['Masculino', 'MALE'], ['Male', 'MALE']])(
    '"%s" → %s', (input, expected) => {
      expect(normalizeGender(input)).toBe(expected);
    });

  it.each([['F', 'FEMALE'], ['Feminino', 'FEMALE'], ['female', 'FEMALE']])(
    '"%s" → %s', (input, expected) => {
      expect(normalizeGender(input)).toBe(expected);
    });

  it('rejeita valor inválido', () => {
    expect(() => normalizeGender('X')).toThrow('gênero inválido "X"');
  });

  it('rejeita ausente', () => {
    expect(() => normalizeGender(undefined)).toThrow('gênero ausente');
  });
});
```

- [ ] **Passo 5: Rodar testes**

```bash
cd packages/api && npm test -- normalize-gender bulk-create
```

Esperado: passam.

- [ ] **Passo 6: Commit**

```bash
git add packages/api/src/modules/participants
git commit -m "feat(api): parse gender column in participant import"
```

---

## Tarefa 4 — Cálculo de Ranking com `genderMode`

**Arquivos:**
- Localizar: serviço de resultados (`grep -rln "computeRanking\|ranking" packages/api/src/modules`)
- Modificar: arquivo do service
- Modificar: spec correspondente

- [ ] **Passo 1: Localizar service**

```bash
grep -rln "topN\|ranking\|TOP_N" packages/api/src/modules
```

Anotar caminho. Provavelmente em `modules/reports` ou `modules/results`.

- [ ] **Passo 2: Definir tipo de retorno**

No service, definir/atualizar:

```ts
export type RankEntry = {
  participantId: string;
  name: string;
  totalScore: number;
  position: number;
};

export type RankingResult =
  | { mode: 'MIXED' | 'MALE_ONLY' | 'FEMALE_ONLY'; entries: RankEntry[] }
  | { mode: 'UNISEX_SPLIT'; male: RankEntry[]; female: RankEntry[] };
```

- [ ] **Passo 3: Implementar `computeRanking`**

```ts
async computeRanking(eventId: string, categoryId: string): Promise<RankingResult> {
  const category = await this.prisma.category.findUniqueOrThrow({
    where: { id: categoryId },
    include: { event: true },
  });
  const topN = category.event.topN;

  const all = await this.prisma.participant.findMany({
    where: { eventId, isAbsent: false },
  });
  const scoresByParticipant = await this.aggregateScores(eventId, categoryId);

  const buildEntries = (parts: typeof all): RankEntry[] =>
    parts
      .map((p) => ({
        participantId: p.id,
        name: p.name,
        gender: p.gender,
        totalScore: scoresByParticipant.get(p.id) ?? 0,
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, topN)
      .map(({ gender, ...rest }, i) => ({ ...rest, position: i + 1 }));

  switch (category.genderMode) {
    case 'MIXED':
      return { mode: 'MIXED', entries: buildEntries(all) };
    case 'MALE_ONLY':
      return { mode: 'MALE_ONLY', entries: buildEntries(all.filter((p) => p.gender === 'MALE')) };
    case 'FEMALE_ONLY':
      return { mode: 'FEMALE_ONLY', entries: buildEntries(all.filter((p) => p.gender === 'FEMALE')) };
    case 'UNISEX_SPLIT':
      return {
        mode: 'UNISEX_SPLIT',
        male: buildEntries(all.filter((p) => p.gender === 'MALE')),
        female: buildEntries(all.filter((p) => p.gender === 'FEMALE')),
      };
  }
}
```

`aggregateScores` é o método existente que retorna `Map<participantId, totalScore>` aplicando `CalculationRule`. Reutilizar — não duplicar.

- [ ] **Passo 4: Escrever testes para os 4 modos**

Em spec do service, adicionar fixture com 3 homens (notas 30, 25, 20) e 3 mulheres (notas 28, 22, 18) numa única categoria com `topN=2`:

```ts
describe('computeRanking', () => {
  it('MIXED retorna top2 unificado', async () => {
    await setCategoryMode(categoryId, 'MIXED');
    const r = await service.computeRanking(eventId, categoryId);
    expect(r.mode).toBe('MIXED');
    expect((r as any).entries).toHaveLength(2);
    expect((r as any).entries[0].totalScore).toBe(30);
    expect((r as any).entries[1].totalScore).toBe(28);
  });

  it('MALE_ONLY filtra mulheres', async () => {
    await setCategoryMode(categoryId, 'MALE_ONLY');
    const r = await service.computeRanking(eventId, categoryId);
    expect((r as any).entries.every((e: any) => /* só homens */ true)).toBe(true);
    expect((r as any).entries[0].totalScore).toBe(30);
  });

  it('FEMALE_ONLY filtra homens', async () => {
    await setCategoryMode(categoryId, 'FEMALE_ONLY');
    const r = await service.computeRanking(eventId, categoryId);
    expect((r as any).entries[0].totalScore).toBe(28);
  });

  it('UNISEX_SPLIT retorna dois rankings com topN cada', async () => {
    await setCategoryMode(categoryId, 'UNISEX_SPLIT');
    const r = await service.computeRanking(eventId, categoryId);
    expect(r.mode).toBe('UNISEX_SPLIT');
    expect((r as any).male).toHaveLength(2);
    expect((r as any).female).toHaveLength(2);
    expect((r as any).male[0].totalScore).toBe(30);
    expect((r as any).female[0].totalScore).toBe(28);
  });
});
```

- [ ] **Passo 5: Rodar testes**

```bash
cd packages/api && npm test -- results.service
```

Esperado: passam.

- [ ] **Passo 6: Commit**

```bash
git add packages/api/src/modules
git commit -m "feat(api): rank by category genderMode (mixed, only, split)"
```

---

## Tarefa 5 — Endpoints de Liberação de Resultados

**Arquivos:**
- Criar: `packages/api/src/modules/result-releases/result-releases.module.ts`
- Criar: `packages/api/src/modules/result-releases/result-releases.controller.ts`
- Criar: `packages/api/src/modules/result-releases/result-releases.service.ts`
- Criar: `packages/api/src/modules/result-releases/dto/create-result-release.dto.ts`
- Criar: `packages/api/src/modules/result-releases/__tests__/result-releases.service.spec.ts`
- Modificar: `packages/api/src/app.module.ts` (registrar)

- [ ] **Passo 1: Criar DTO**

```ts
// create-result-release.dto.ts
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Gender } from '@prisma/client';

export class CreateResultReleaseDto {
  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender | null;

  @IsInt()
  @Min(1)
  position!: number;
}
```

- [ ] **Passo 2: Criar service com método `release`**

```ts
// result-releases.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';  // ajustar import
import { ResultsService } from '../results/results.service'; // ajustar import
import { AuditService } from '../audit/audit.service'; // ajustar import
import { Gender, EventStatus } from '@prisma/client';

@Injectable()
export class ResultReleasesService {
  constructor(
    private prisma: PrismaService,
    private results: ResultsService,
    private audit: AuditService,
  ) {}

  async release(eventId: string, userId: string, dto: { categoryId: string; gender?: Gender | null; position: number }) {
    const event = await this.prisma.judgingEvent.findUniqueOrThrow({ where: { id: eventId } });
    if (event.status !== EventStatus.FINISHED) {
      throw new BadRequestException('Evento precisa estar encerrado para liberar resultados.');
    }

    const category = await this.prisma.category.findUniqueOrThrow({ where: { id: dto.categoryId } });
    if (category.eventId !== eventId) {
      throw new BadRequestException('Categoria não pertence ao evento.');
    }

    const expectedGender = this.expectedGenderFor(category.genderMode, dto.gender ?? null);

    const ranking = await this.results.computeRanking(eventId, dto.categoryId);
    const entries = this.entriesFor(ranking, expectedGender);
    const exists = entries.find((e) => e.position === dto.position);
    if (!exists) {
      throw new BadRequestException(`Posição ${dto.position} não disponível no ranking.`);
    }

    const created = await this.prisma.resultRelease.create({
      data: {
        eventId,
        categoryId: dto.categoryId,
        gender: expectedGender,
        position: dto.position,
        releasedById: userId,
      },
    });

    await this.audit.record({
      actorId: userId,
      actorType: 'USER',
      action: 'RESULT_RELEASED',
      entityType: 'Category',
      entityId: dto.categoryId,
      payload: { gender: expectedGender, position: dto.position, participantId: exists.participantId },
    });

    return created;
  }

  async revert(eventId: string, userId: string, releaseId: string) {
    const release = await this.prisma.resultRelease.findUniqueOrThrow({ where: { id: releaseId } });
    if (release.eventId !== eventId) {
      throw new BadRequestException('Release não pertence ao evento.');
    }
    await this.prisma.resultRelease.delete({ where: { id: releaseId } });
    await this.audit.record({
      actorId: userId,
      actorType: 'USER',
      action: 'RESULT_UNRELEASED',
      entityType: 'Category',
      entityId: release.categoryId,
      payload: { gender: release.gender, position: release.position },
    });
    return { id: releaseId };
  }

  async list(eventId: string) {
    return this.prisma.resultRelease.findMany({
      where: { eventId },
      orderBy: [{ categoryId: 'asc' }, { gender: 'asc' }, { position: 'asc' }],
    });
  }

  private expectedGenderFor(mode: string, provided: Gender | null): Gender | null {
    switch (mode) {
      case 'MIXED':
        if (provided != null) throw new BadRequestException('Categoria mista não aceita gênero.');
        return null;
      case 'MALE_ONLY':
        if (provided !== 'MALE') throw new BadRequestException('Categoria exclusiva masculina exige gender=MALE.');
        return 'MALE';
      case 'FEMALE_ONLY':
        if (provided !== 'FEMALE') throw new BadRequestException('Categoria exclusiva feminina exige gender=FEMALE.');
        return 'FEMALE';
      case 'UNISEX_SPLIT':
        if (provided !== 'MALE' && provided !== 'FEMALE') {
          throw new BadRequestException('Categoria unissex split exige gender MALE ou FEMALE.');
        }
        return provided;
      default:
        throw new BadRequestException('Modo de gênero desconhecido.');
    }
  }

  private entriesFor(ranking: any, gender: Gender | null) {
    if (ranking.mode === 'UNISEX_SPLIT') {
      return gender === 'MALE' ? ranking.male : ranking.female;
    }
    return ranking.entries;
  }
}
```

- [ ] **Passo 3: Criar controller**

```ts
// result-releases.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // ajustar
import { ResultReleasesService } from './result-releases.service';
import { CreateResultReleaseDto } from './dto/create-result-release.dto';
import { ResultReleasesGateway } from './result-releases.gateway'; // criada na próxima tarefa

@UseGuards(JwtAuthGuard)
@Controller('events/:eventId/results/releases')
export class ResultReleasesController {
  constructor(
    private service: ResultReleasesService,
    private gateway: ResultReleasesGateway,
  ) {}

  @Get()
  list(@Param('eventId') eventId: string) {
    return this.service.list(eventId);
  }

  @Post()
  async create(@Param('eventId') eventId: string, @Body() dto: CreateResultReleaseDto, @Req() req: any) {
    const release = await this.service.release(eventId, req.user.id, dto);
    this.gateway.emitReleased(eventId, release);
    return release;
  }

  @Delete(':releaseId')
  async remove(@Param('eventId') eventId: string, @Param('releaseId') releaseId: string, @Req() req: any) {
    const result = await this.service.revert(eventId, req.user.id, releaseId);
    this.gateway.emitUnreleased(eventId, releaseId);
    return result;
  }
}
```

- [ ] **Passo 4: Criar module e registrar em `app.module.ts`**

```ts
// result-releases.module.ts
import { Module } from '@nestjs/common';
import { ResultReleasesService } from './result-releases.service';
import { ResultReleasesController } from './result-releases.controller';
import { ResultReleasesGateway } from './result-releases.gateway';
import { PrismaModule } from '../prisma/prisma.module'; // ajustar
import { ResultsModule } from '../results/results.module'; // ajustar
import { AuditModule } from '../audit/audit.module'; // ajustar

@Module({
  imports: [PrismaModule, ResultsModule, AuditModule],
  providers: [ResultReleasesService, ResultReleasesGateway],
  controllers: [ResultReleasesController],
  exports: [ResultReleasesGateway],
})
export class ResultReleasesModule {}
```

Em `app.module.ts`, adicionar `ResultReleasesModule` em `imports`.

- [ ] **Passo 5: Escrever spec do service**

Em `__tests__/result-releases.service.spec.ts`:

```ts
describe('ResultReleasesService', () => {
  it('rejeita release se evento IN_PROGRESS', async () => {
    // setup evento status IN_PROGRESS
    await expect(service.release(eventId, userId, { categoryId, gender: null, position: 1 }))
      .rejects.toThrow('encerrado');
  });

  it('rejeita gender em categoria MIXED', async () => {
    // setup FINISHED + categoria MIXED
    await expect(service.release(eventId, userId, { categoryId, gender: 'MALE', position: 1 }))
      .rejects.toThrow('mista não aceita');
  });

  it('rejeita posição fora do ranking', async () => {
    // setup ranking com 2 entradas
    await expect(service.release(eventId, userId, { categoryId, gender: null, position: 5 }))
      .rejects.toThrow('não disponível');
  });

  it('cria release e grava audit log', async () => {
    const r = await service.release(eventId, userId, { categoryId, gender: null, position: 1 });
    expect(r.position).toBe(1);
    const log = await prisma.auditLog.findFirst({ where: { action: 'RESULT_RELEASED' } });
    expect(log).toBeTruthy();
  });

  it('revert remove e grava audit log', async () => {
    const r = await service.release(eventId, userId, { categoryId, gender: null, position: 1 });
    await service.revert(eventId, userId, r.id);
    const exists = await prisma.resultRelease.findUnique({ where: { id: r.id } });
    expect(exists).toBeNull();
    const log = await prisma.auditLog.findFirst({ where: { action: 'RESULT_UNRELEASED' } });
    expect(log).toBeTruthy();
  });
});
```

- [ ] **Passo 6: Rodar testes**

```bash
cd packages/api && npm test -- result-releases.service
```

Esperado: passam (gateway será criado na próxima tarefa — mockar nessa spec ou suspender o emit).

- [ ] **Passo 7: Commit**

```bash
git add packages/api/src
git commit -m "feat(api): add result release endpoints with audit"
```

---

## Tarefa 6 — Gateway WebSocket Público

**Arquivos:**
- Criar: `packages/api/src/modules/result-releases/result-releases.gateway.ts`
- Modificar: `packages/api/src/modules/scoring/public-live.gateway.ts` (referência apenas — não modificar)
- Modificar: `packages/api/src/modules/events/public-events.controller.ts`

- [ ] **Passo 1: Criar gateway**

```ts
// result-releases.gateway.ts
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ namespace: '/public-live', cors: { origin: '*' } })
export class ResultReleasesGateway {
  @WebSocketServer() server!: Server;

  emitReleased(eventId: string, release: any) {
    this.server.to(`event:${eventId}`).emit('result:released', release);
  }

  emitUnreleased(eventId: string, releaseId: string) {
    this.server.to(`event:${eventId}`).emit('result:unreleased', { id: releaseId });
  }
}
```

Verificar antes em `public-live.gateway.ts` qual é o namespace e a convenção de room (`event:${eventId}` ou similar). Alinhar ambos.

- [ ] **Passo 2: Adicionar endpoint `GET /public/events/:id/results`**

Em `public-events.controller.ts`, adicionar método:

```ts
@Get(':id/results')
async getPublicResults(@Param('id') id: string) {
  const event = await this.prisma.judgingEvent.findUniqueOrThrow({
    where: { id },
    include: { categories: true },
  });

  const releases = await this.prisma.resultRelease.findMany({ where: { eventId: id } });
  const releasedByCat = new Map<string, typeof releases>();
  for (const r of releases) {
    const arr = releasedByCat.get(r.categoryId) ?? [];
    arr.push(r);
    releasedByCat.set(r.categoryId, arr);
  }

  const categories = await Promise.all(
    event.categories.map(async (cat) => {
      const ranking = await this.results.computeRanking(id, cat.id);
      const rels = releasedByCat.get(cat.id) ?? [];
      return {
        categoryId: cat.id,
        name: cat.name,
        genderMode: cat.genderMode,
        released: this.buildReleased(ranking, rels),
      };
    }),
  );

  return { status: event.status, categories };
}

private buildReleased(ranking: any, rels: any[]) {
  const pick = (entries: any[], gender: 'MALE' | 'FEMALE' | null) =>
    rels
      .filter((r) => r.gender === gender)
      .map((r) => entries.find((e: any) => e.position === r.position))
      .filter(Boolean);

  if (ranking.mode === 'UNISEX_SPLIT') {
    return { MALE: pick(ranking.male, 'MALE'), FEMALE: pick(ranking.female, 'FEMALE') };
  }
  if (ranking.mode === 'MALE_ONLY') return { MALE: pick(ranking.entries, 'MALE') };
  if (ranking.mode === 'FEMALE_ONLY') return { FEMALE: pick(ranking.entries, 'FEMALE') };
  return { MIXED: pick(ranking.entries, null) };
}
```

Adicionar `ResultsService` e `PrismaService` ao construtor do controller via injeção.

- [ ] **Passo 3: Escrever spec**

Em `public-events.controller.spec.ts`:

```ts
it('só expõe posições com release correspondente', async () => {
  // setup: categoria MIXED com top4, libera só pos 4 e 3
  const res = await controller.getPublicResults(eventId);
  expect(res.categories[0].released.MIXED).toHaveLength(2);
  expect(res.categories[0].released.MIXED.map((r: any) => r.position).sort()).toEqual([3, 4]);
});
```

- [ ] **Passo 4: Rodar testes**

```bash
cd packages/api && npm test -- public-events
```

- [ ] **Passo 5: Commit**

```bash
git add packages/api/src
git commit -m "feat(api): expose public results endpoint and gateway events"
```

---

## Tarefa 7 — Web: Forms de Evento e Categoria com `genderMode`

**Arquivos:**
- Modificar: `packages/web/src/app/(admin)/events/new/page.tsx`
- Modificar: `packages/web/src/app/(admin)/events/[id]/edit/page.tsx`
- Modificar: schema/tipo do form de categoria (localizar via `grep -rln "displayOrder" packages/web/src`)

- [ ] **Passo 1: Localizar componente de linha de categoria**

```bash
grep -rln "displayOrder\|category" packages/web/src/app/\(admin\)/events
```

Anotar o componente reutilizado em new/edit.

- [ ] **Passo 2: Adicionar tipo `CategoryGenderMode`**

Em `packages/web/src/lib/types.ts` (ou arquivo equivalente):

```ts
export type CategoryGenderMode = 'MIXED' | 'MALE_ONLY' | 'FEMALE_ONLY' | 'UNISEX_SPLIT';
```

- [ ] **Passo 3: Adicionar select no componente da categoria**

Editar componente. Adicionar campo após nome/displayOrder:

```tsx
<select
  value={category.genderMode ?? 'MIXED'}
  onChange={(e) => onChange({ ...category, genderMode: e.target.value as CategoryGenderMode })}
  className="..."
  aria-label="Modo de gênero"
>
  <option value="MIXED">Mista</option>
  <option value="MALE_ONLY">Só masculino</option>
  <option value="FEMALE_ONLY">Só feminino</option>
  <option value="UNISEX_SPLIT">Unissex (rankings separados)</option>
</select>
```

Tooltip com texto: "Unissex: todos pontuam juntos, mas o resultado é exibido em dois rankings separados."

- [ ] **Passo 4: Atualizar payload de submit**

Garantir que o submit em new/edit envia `genderMode` em cada categoria.

- [ ] **Passo 5: Teste**

Em `__tests__` correspondente, adicionar:

```tsx
it('envia genderMode no submit', async () => {
  // render form, preenche categoria com UNISEX_SPLIT, submete
  expect(submitMock).toHaveBeenCalledWith(
    expect.objectContaining({
      categories: expect.arrayContaining([expect.objectContaining({ genderMode: 'UNISEX_SPLIT' })]),
    }),
  );
});
```

- [ ] **Passo 6: Rodar testes**

```bash
cd packages/web && npm test -- events
```

- [ ] **Passo 7: Commit**

```bash
git add packages/web/src
git commit -m "feat(web): category genderMode selector on event forms"
```

---

## Tarefa 8 — Web: Cadastro/Listagem/Import de Participante com Gênero

**Arquivos:**
- Modificar: form individual de participante
- Modificar: página de listagem
- Modificar: `ImportParticipantsModal` e hook `useImportParticipants`
- Modificar: template baixável (se existe)

- [ ] **Passo 1: Localizar arquivos**

```bash
grep -rln "ImportParticipantsModal\|useImportParticipants" packages/web/src
```

- [ ] **Passo 2: Adicionar tipo `Gender`**

Em `packages/web/src/lib/types.ts`:

```ts
export type Gender = 'MALE' | 'FEMALE';
```

- [ ] **Passo 3: Form individual — campo radio**

Editar form de participante:

```tsx
<fieldset>
  <legend>Gênero *</legend>
  <label>
    <input
      type="radio"
      name="gender"
      value="MALE"
      checked={form.gender === 'MALE'}
      onChange={() => setForm({ ...form, gender: 'MALE' })}
      required
    /> Masculino
  </label>
  <label>
    <input
      type="radio"
      name="gender"
      value="FEMALE"
      checked={form.gender === 'FEMALE'}
      onChange={() => setForm({ ...form, gender: 'FEMALE' })}
    /> Feminino
  </label>
</fieldset>
```

- [ ] **Passo 4: Listagem — coluna gênero + filtro**

Adicionar coluna na tabela:

```tsx
<td>
  <span className={participant.gender === 'MALE' ? 'badge-blue' : 'badge-pink'}>
    {participant.gender === 'MALE' ? 'M' : 'F'}
  </span>
</td>
```

Filtro acima da tabela:

```tsx
<select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
  <option value="">Todos</option>
  <option value="MALE">Masculino</option>
  <option value="FEMALE">Feminino</option>
</select>
```

Aplicar filtro client-side em `participants.filter`.

- [ ] **Passo 5: Import modal — preview e validação**

Em `ImportParticipantsModal`:

- Adicionar coluna "Gênero" no preview da tabela.
- Detectar header `genero`/`gender` (case-insensitive) no parser do hook.
- Para cada linha: se gênero ausente ou inválido, marcar linha com `error: 'gênero inválido'` e exibir badge vermelho.
- Texto de help no modal: "A planilha deve ter coluna `genero` com valores: M, F, Masculino, Feminino."

Atualizar template baixável (se existe) para incluir coluna `genero`.

- [ ] **Passo 6: Testes**

Em `ImportParticipantsModal.spec.tsx`:

```tsx
it('mostra erro em linha sem gênero', async () => {
  const csv = 'nome,ordem\nJoão,1';
  // simular upload
  await waitFor(() => expect(screen.getByText(/gênero inválido|ausente/i)).toBeInTheDocument());
});

it('aceita Masculino/M/Male', async () => {
  const csv = 'nome,ordem,genero\nJoão,1,M\nMaria,2,Feminino\nPaulo,3,Male';
  // submeter, verificar 3 linhas válidas
});
```

- [ ] **Passo 7: Rodar testes**

```bash
cd packages/web && npm test -- participants Import
```

- [ ] **Passo 8: Commit**

```bash
git add packages/web/src
git commit -m "feat(web): participant gender field on form, list and import"
```

---

## Tarefa 9 — Web: Tela Admin Live com Painel de Liberação

**Arquivos:**
- Modificar: `packages/web/src/app/(admin)/events/[id]/live/page.tsx`
- Criar: `packages/web/src/components/live/ReleasePanel.tsx`
- Criar: `packages/web/src/components/live/ReleaseSlot.tsx`
- Criar: `packages/web/src/hooks/useLiveResults.ts`
- Modificar: `packages/web/src/app/(admin)/events/[id]/live/__tests__/page.spec.tsx`

- [ ] **Passo 1: Criar hook `useLiveResults`**

```ts
// hooks/useLiveResults.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api'; // ajustar
import { useEffect } from 'react';
import { getPublicLiveSocket } from '@/lib/socket'; // ajustar — reutiliza existente

type Release = {
  id: string;
  eventId: string;
  categoryId: string;
  gender: 'MALE' | 'FEMALE' | null;
  position: number;
  releasedAt: string;
  releasedById: string;
};

export function useLiveResults(eventId: string) {
  const qc = useQueryClient();

  const { data: releases = [] } = useQuery<Release[]>({
    queryKey: ['live-results', eventId],
    queryFn: () => api.get(`/events/${eventId}/results/releases`).then((r) => r.data),
  });

  const release = useMutation({
    mutationFn: (input: { categoryId: string; gender: 'MALE' | 'FEMALE' | null; position: number }) =>
      api.post(`/events/${eventId}/results/releases`, input).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['live-results', eventId] }),
  });

  const revert = useMutation({
    mutationFn: (releaseId: string) =>
      api.delete(`/events/${eventId}/results/releases/${releaseId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['live-results', eventId] }),
  });

  useEffect(() => {
    const socket = getPublicLiveSocket();
    socket.emit('join', { eventId });
    const onReleased = () => qc.invalidateQueries({ queryKey: ['live-results', eventId] });
    const onUnreleased = () => qc.invalidateQueries({ queryKey: ['live-results', eventId] });
    socket.on('result:released', onReleased);
    socket.on('result:unreleased', onUnreleased);
    return () => {
      socket.off('result:released', onReleased);
      socket.off('result:unreleased', onUnreleased);
    };
  }, [eventId, qc]);

  return { releases, release, revert };
}
```

- [ ] **Passo 2: Criar `ReleaseSlot`**

```tsx
// components/live/ReleaseSlot.tsx
type Props = {
  position: number;
  gender: 'MALE' | 'FEMALE' | null;
  released?: { id: string; participantName: string; score: number };
  prevReleased: boolean;
  onRelease: () => void;
  onRevert: () => void;
};

export function ReleaseSlot({ position, released, prevReleased, onRelease, onRevert }: Props) {
  if (released) {
    return (
      <div className="rounded border p-2">
        <div className="text-sm">{position}º lugar</div>
        <div className="font-bold">{released.participantName}</div>
        <div className="text-xs">Nota: {released.score.toFixed(1)}</div>
        <button onClick={onRevert} className="text-xs text-red-600">Reverter</button>
      </div>
    );
  }
  return (
    <div className="rounded border border-dashed p-2 opacity-60">
      <div className="text-sm">{position}º lugar</div>
      <div className="text-gray-400">— oculto —</div>
      <button onClick={onRelease} disabled={!prevReleased} className="text-xs">
        Liberar {position}º lugar
      </button>
    </div>
  );
}
```

Regra de habilitação: `prevReleased` deve ser `true` para posições 3, 2, 1 (i.e., posição N só libera se N+1 já liberada). Posição `topN` (4) sempre `prevReleased = true`.

- [ ] **Passo 3: Criar `ReleasePanel`**

```tsx
// components/live/ReleasePanel.tsx
import { useLiveResults } from '@/hooks/useLiveResults';
import { ReleaseSlot } from './ReleaseSlot';

type Category = {
  id: string;
  name: string;
  genderMode: 'MIXED' | 'MALE_ONLY' | 'FEMALE_ONLY' | 'UNISEX_SPLIT';
  ranking: any; // mesmo formato do RankingResult
};

export function ReleasePanel({ eventId, categories }: { eventId: string; categories: Category[] }) {
  const { releases, release, revert } = useLiveResults(eventId);

  const renderColumn = (cat: Category, gender: 'MALE' | 'FEMALE' | null, entries: any[]) => {
    const sorted = [...entries].sort((a, b) => b.position - a.position); // 4,3,2,1
    return (
      <div className="space-y-2">
        {sorted.map((entry, idx) => {
          const rel = releases.find(
            (r) => r.categoryId === cat.id && r.gender === gender && r.position === entry.position,
          );
          const isLast = entry.position === Math.max(...entries.map((e) => e.position));
          const prevRel = isLast
            ? true
            : releases.some(
                (r) => r.categoryId === cat.id && r.gender === gender && r.position === entry.position + 1,
              );
          return (
            <ReleaseSlot
              key={entry.position}
              position={entry.position}
              gender={gender}
              released={rel ? { id: rel.id, participantName: entry.name, score: entry.totalScore } : undefined}
              prevReleased={prevRel}
              onRelease={() => release.mutate({ categoryId: cat.id, gender, position: entry.position })}
              onRevert={() => rel && revert.mutate(rel.id)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <section className="mt-6">
      <h2 className="text-xl font-bold mb-4">Liberação de resultados</h2>
      <div className="grid gap-4">
        {categories.map((cat) => (
          <div key={cat.id} className="rounded-lg border p-4">
            <header className="flex justify-between mb-2">
              <h3 className="font-semibold">{cat.name}</h3>
              <span className="text-xs">{cat.genderMode}</span>
            </header>
            {cat.ranking.mode === 'UNISEX_SPLIT' ? (
              <div className="grid grid-cols-2 gap-4">
                <div><div className="text-sm font-bold mb-2">Masculino</div>{renderColumn(cat, 'MALE', cat.ranking.male)}</div>
                <div><div className="text-sm font-bold mb-2">Feminino</div>{renderColumn(cat, 'FEMALE', cat.ranking.female)}</div>
              </div>
            ) : cat.ranking.mode === 'MALE_ONLY' ? (
              renderColumn(cat, 'MALE', cat.ranking.entries)
            ) : cat.ranking.mode === 'FEMALE_ONLY' ? (
              renderColumn(cat, 'FEMALE', cat.ranking.entries)
            ) : (
              renderColumn(cat, null, cat.ranking.entries)
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Passo 4: Renderizar `ReleasePanel` quando evento `FINISHED`**

Em `events/[id]/live/page.tsx`:

```tsx
{event.status === 'FINISHED' && (
  <>
    <div className="badge">Evento encerrado</div>
    <ReleasePanel eventId={event.id} categories={categoriesWithRanking} />
  </>
)}
```

`categoriesWithRanking` vem de novo endpoint admin (ou reusa `GET /events/:id/results/full` se existir). Se não existir, criar `GET /events/:id/results/full` no backend que retorna `{categories: [{id, name, genderMode, ranking: RankingResult}]}`. Sem proteção pública — usa autenticação normal.

> **Nota:** se o endpoint `/results/full` não existir, adicionar em `ResultsController` antes desta tarefa. Se já existir com formato diferente, adaptar.

- [ ] **Passo 5: Testes**

Em `live/__tests__/page.spec.tsx`:

```tsx
it('FINISHED sem releases mostra todos slots ocultos', async () => {
  // mock useLiveResults retornando releases: [], categories com ranking pronto
  render(<Page eventId={eventId} />);
  expect(screen.getAllByText(/oculto/i).length).toBeGreaterThan(0);
});

it('botão "Liberar 3º" desabilitado se 4º não liberado', async () => {
  render(<Page eventId={eventId} />);
  const btn = screen.getByRole('button', { name: /Liberar 3º/i });
  expect(btn).toBeDisabled();
});

it('UNISEX_SPLIT renderiza 2 colunas', async () => {
  // mock categoria com ranking.mode = UNISEX_SPLIT
  render(<Page eventId={eventId} />);
  expect(screen.getByText('Masculino')).toBeInTheDocument();
  expect(screen.getByText('Feminino')).toBeInTheDocument();
});
```

- [ ] **Passo 6: Rodar testes**

```bash
cd packages/web && npm test -- live
```

- [ ] **Passo 7: Commit**

```bash
git add packages/web/src
git commit -m "feat(web): admin live release panel with position-by-position reveal"
```

---

## Tarefa 10 — Web: Tela Live Pública com Revelação Progressiva

**Arquivos:**
- Modificar: `packages/web/src/app/(live)/live/[eventId]/page.tsx`
- Criar: `packages/web/src/components/live/PublicResultsBoard.tsx`
- Criar: `packages/web/src/hooks/usePublicResults.ts`

- [ ] **Passo 1: Criar hook `usePublicResults`**

```ts
// hooks/usePublicResults.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getPublicLiveSocket } from '@/lib/socket';
import { api } from '@/lib/api';

export function usePublicResults(eventId: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['public-results', eventId],
    queryFn: () => api.get(`/public/events/${eventId}/results`).then((r) => r.data),
  });

  useEffect(() => {
    const socket = getPublicLiveSocket();
    socket.emit('join', { eventId });
    const refetch = () => qc.invalidateQueries({ queryKey: ['public-results', eventId] });
    socket.on('result:released', refetch);
    socket.on('result:unreleased', refetch);
    return () => {
      socket.off('result:released', refetch);
      socket.off('result:unreleased', refetch);
    };
  }, [eventId, qc]);

  return query;
}
```

- [ ] **Passo 2: Criar `PublicResultsBoard`**

```tsx
// components/live/PublicResultsBoard.tsx
import { motion, AnimatePresence } from 'framer-motion'; // ou alternativa já usada no projeto

type Entry = { position: number; participantId: string; name: string; totalScore: number };
type Released = { MIXED?: Entry[]; MALE?: Entry[]; FEMALE?: Entry[] };

export function PublicResultsBoard({
  categories,
}: {
  categories: { categoryId: string; name: string; genderMode: string; released: Released }[];
}) {
  const totalReleased = categories.reduce(
    (acc, c) => acc + Object.values(c.released).reduce((s, arr) => s + (arr?.length ?? 0), 0),
    0,
  );

  if (totalReleased === 0) {
    return (
      <div className="flex h-screen items-center justify-center text-3xl">
        Aguardando divulgação dos resultados…
      </div>
    );
  }

  const renderColumn = (entries: Entry[] | undefined, label?: string) => (
    <div>
      {label && <h4 className="font-bold mb-2">{label}</h4>}
      <AnimatePresence>
        {[...(entries ?? [])].sort((a, b) => a.position - b.position).map((e) => (
          <motion.div
            key={e.position}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="my-2 rounded p-3 bg-white/10"
          >
            <div className="text-2xl">{e.position}º</div>
            <div className="text-3xl font-bold">{e.name}</div>
            <div className="text-sm">{e.totalScore.toFixed(1)}</div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="space-y-8 p-6">
      {categories.map((cat) => (
        <section key={cat.categoryId}>
          <h3 className="text-xl mb-4">{cat.name}</h3>
          {cat.genderMode === 'UNISEX_SPLIT' ? (
            <div className="grid grid-cols-2 gap-6">
              {renderColumn(cat.released.MALE, 'Masculino')}
              {renderColumn(cat.released.FEMALE, 'Feminino')}
            </div>
          ) : cat.genderMode === 'MALE_ONLY' ? (
            renderColumn(cat.released.MALE, 'Masculino')
          ) : cat.genderMode === 'FEMALE_ONLY' ? (
            renderColumn(cat.released.FEMALE, 'Feminino')
          ) : (
            renderColumn(cat.released.MIXED)
          )}
        </section>
      ))}
    </div>
  );
}
```

> **Nota:** se `framer-motion` não estiver no projeto, usar transições CSS simples (Tailwind `transition`). Verificar `packages/web/package.json` antes.

- [ ] **Passo 3: Plugar na página pública**

Em `(live)/live/[eventId]/page.tsx`:

```tsx
const { data, isLoading } = usePublicResults(eventId);

if (data?.status === 'FINISHED') {
  return <PublicResultsBoard categories={data.categories} />;
}
// senão, comportamento atual (live de pontuação)
```

- [ ] **Passo 4: Teste de snapshot/render**

Em `__tests__` da página pública:

```tsx
it('mostra "Aguardando divulgação" quando FINISHED sem releases', () => {
  // mock usePublicResults retornando data.status='FINISHED' e categorias com released vazio
  render(<PublicResultsBoard categories={[{ categoryId: 'c', name: 'Geral', genderMode: 'MIXED', released: {} }]} />);
  expect(screen.getByText(/Aguardando divulgação/i)).toBeInTheDocument();
});

it('renderiza 2 colunas em UNISEX_SPLIT', () => {
  const cats = [{
    categoryId: 'c', name: 'Geral', genderMode: 'UNISEX_SPLIT',
    released: { MALE: [{ position: 4, participantId: 'p1', name: 'João', totalScore: 30 }], FEMALE: [] },
  }];
  render(<PublicResultsBoard categories={cats} />);
  expect(screen.getByText('Masculino')).toBeInTheDocument();
  expect(screen.getByText('Feminino')).toBeInTheDocument();
  expect(screen.getByText('João')).toBeInTheDocument();
});
```

- [ ] **Passo 5: Rodar testes**

```bash
cd packages/web && npm test -- public-results PublicResultsBoard
```

- [ ] **Passo 6: Commit**

```bash
git add packages/web/src
git commit -m "feat(web): public live progressive results reveal"
```

---

## Tarefa 11 — Auditoria de Mudanças em Categoria/Participante

**Arquivos:**
- Modificar: services de categoria e participante
- Modificar: specs correspondentes

- [ ] **Passo 1: Logar `CATEGORY_GENDER_MODE_CHANGED`**

Em service de categoria, no método `update`, comparar `oldGenderMode` vs `newGenderMode`. Se diferente:

```ts
await this.audit.record({
  actorId: userId,
  actorType: 'USER',
  action: 'CATEGORY_GENDER_MODE_CHANGED',
  entityType: 'Category',
  entityId: id,
  payload: { from: existing.genderMode, to: dto.genderMode },
});
```

- [ ] **Passo 2: Logar `PARTICIPANT_GENDER_CHANGED`**

Em service de participante, em `update`, comparar `gender` antigo vs novo. Mesma estrutura, action `PARTICIPANT_GENDER_CHANGED`.

- [ ] **Passo 3: Testes**

Em specs:

```ts
it('grava audit log ao mudar genderMode', async () => {
  await service.update(categoryId, userId, { genderMode: 'UNISEX_SPLIT' });
  const log = await prisma.auditLog.findFirst({ where: { action: 'CATEGORY_GENDER_MODE_CHANGED' } });
  expect(log?.payload).toMatchObject({ from: 'MIXED', to: 'UNISEX_SPLIT' });
});
```

- [ ] **Passo 4: Rodar e commitar**

```bash
cd packages/api && npm test -- categories.service participants.service
git add packages/api/src
git commit -m "feat(api): audit gender mode and participant gender changes"
```

---

## Tarefa 12 — Relatórios e Certificados Refletindo Distinção

**Arquivos:**
- Modificar: gerador de relatório TOP_N (`grep -rln "TOP_N\|generateTopN" packages/api/src`)
- Modificar: gerador de certificados (`grep -rln "certificate" packages/api/src`)
- Modificar: specs correspondentes

- [ ] **Passo 1: Atualizar relatório TOP_N**

Localizar gerador. Em vez de produzir uma lista por categoria, consumir `computeRanking` e gerar:
- `MIXED`: uma seção `Top N — <Categoria>`.
- `MALE_ONLY` / `FEMALE_ONLY`: seção `Top N <Categoria> (Masculino|Feminino)`.
- `UNISEX_SPLIT`: duas seções `Top N <Categoria> — Masculino` e `Top N <Categoria> — Feminino`.

- [ ] **Passo 2: Atualizar certificado**

Onde a posição é renderizada no certificado, montar string:
- `MIXED`: `"<N>º lugar — <Categoria>"`.
- demais: `"<N>º lugar <Masculino|Feminino> — <Categoria>"`.

- [ ] **Passo 3: Atualizar relatório DETAILED_BY_JUDGE**

Mesma lógica: separar grupos quando categoria não é `MIXED`.

- [ ] **Passo 4: Testes**

Adicionar specs cobrindo cada modo no relatório TOP_N e certificate:

```ts
it('relatório UNISEX_SPLIT gera duas seções', async () => {
  const out = await reportService.generateTopN(eventId);
  expect(out).toContain('Masculino');
  expect(out).toContain('Feminino');
});

it('certificado MALE_ONLY inclui "Masculino" no texto da posição', async () => {
  const text = await certService.buildText({ category, position: 1, participant });
  expect(text).toContain('Masculino');
});
```

- [ ] **Passo 5: Rodar testes**

```bash
cd packages/api && npm test -- reports certificate
```

- [ ] **Passo 6: Commit**

```bash
git add packages/api/src
git commit -m "feat(api): reports and certificates reflect category gender mode"
```

---

## Tarefa 13 — E2E e Verificação Manual

- [ ] **Passo 1: Subir stack local**

```bash
docker compose up -d
cd packages/api && npm run start:dev &
cd packages/web && npm run dev &
```

- [ ] **Passo 2: Roteiro manual**

1. Criar evento com 2 categorias: "Geral" (UNISEX_SPLIT) e "Técnica" (MALE_ONLY). topN=4.
2. Importar 8 participantes via CSV (4 M, 4 F) com coluna `genero`.
3. Atribuir jurados, pontuar todos.
4. Encerrar evento.
5. Abrir tela live admin: confirmar painel de liberação aparece, "Geral" tem 2 colunas (M/F), "Técnica" só M.
6. Abrir tela live pública em outra aba: confirma "Aguardando divulgação".
7. Liberar 4º M de "Geral": confirma reveal animado na tela pública.
8. Verificar botão 3º M habilitado, 2º M desabilitado.
9. Reverter 4º M: confirma some da tela pública.
10. Liberar todas posições em ordem: 4→1 M, depois 4→1 F.
11. Conferir relatório TOP_N gerado: 2 seções para "Geral", 1 para "Técnica".

- [ ] **Passo 3: Anotar bugs e abrir issues / corrigir inline**

Conforme encontrar problemas, criar tarefas adicionais ou corrigir e commitar.

- [ ] **Passo 4: Commit final (se houver ajustes)**

```bash
git add .
git commit -m "fix: ajustes pós-verificação manual"
```

---

## Resumo de Arquivos Tocados

**Backend:**
- `packages/api/prisma/schema.prisma`, migration nova
- `packages/api/src/modules/participants/*` (DTOs, service, parser de import, specs)
- `packages/api/src/modules/categories/*` (DTOs, service, specs)  *(ou módulo de eventos se categorias vivem lá)*
- `packages/api/src/modules/results/*` (computeRanking)
- `packages/api/src/modules/result-releases/*` (novo módulo completo)
- `packages/api/src/modules/events/public-events.controller.ts`
- `packages/api/src/modules/reports/*` e `certificates/*`
- `packages/api/src/app.module.ts`

**Frontend:**
- `packages/web/src/app/(admin)/events/new/page.tsx`
- `packages/web/src/app/(admin)/events/[id]/edit/page.tsx`
- `packages/web/src/app/(admin)/events/[id]/participants/page.tsx`
- `packages/web/src/app/(admin)/events/[id]/live/page.tsx`
- `packages/web/src/app/(live)/live/[eventId]/page.tsx`
- `packages/web/src/components/live/ReleasePanel.tsx`, `ReleaseSlot.tsx`, `PublicResultsBoard.tsx`
- `packages/web/src/hooks/useLiveResults.ts`, `usePublicResults.ts`
- `packages/web/src/components/ImportParticipantsModal.tsx`
- `packages/web/src/lib/types.ts`
