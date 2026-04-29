# P08 — Módulo categories — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar CRUD completo de categorias aninhado em `/api/events/:eventId/categories`, com reordenação atômica, validações de status e proteções de integridade.

**Architecture:** `CategoriesRepository` encapsula todo acesso Prisma; `CategoriesService` orquestra regras de negócio usando `EventsRepository` para validar isolamento; `CategoriesController` expõe rotas aninhadas sob `events/:eventId`. Seguindo exatamente o padrão estabelecido pelo módulo `events`.

**Tech Stack:** NestJS 11, Fastify, Prisma, class-validator, class-transformer, Vitest, AppException, AuditService.

---

## Mapa de Arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `packages/api/src/modules/categories/categories.module.ts` | Criar | Módulo NestJS importando EventsModule e AuditModule |
| `packages/api/src/modules/categories/categories.repository.ts` | Criar | Todas as queries Prisma de Category |
| `packages/api/src/modules/categories/categories.service.ts` | Criar | Regras de negócio, validações de status, auditoria |
| `packages/api/src/modules/categories/categories.controller.ts` | Criar | Rotas aninhadas em `events/:eventId/categories` |
| `packages/api/src/modules/categories/dto/create-category.dto.ts` | Criar | DTO de criação com `name` e `displayOrder?` |
| `packages/api/src/modules/categories/dto/update-category.dto.ts` | Criar | DTO de atualização (apenas `name`) |
| `packages/api/src/modules/categories/dto/reorder-categories.dto.ts` | Criar | DTO de reordenação com array de `{id, displayOrder}` |
| `packages/api/src/modules/categories/dto/category-response.dto.ts` | Criar | DTO de resposta com `counts` |
| `packages/api/src/modules/categories/__tests__/categories.service.spec.ts` | Criar | Testes unitários do service (14 cenários) |
| `packages/api/src/modules/categories/__tests__/categories.controller.spec.ts` | Criar | Testes unitários do controller (6 cenários) |
| `packages/api/src/app.module.ts` | Modificar | Adicionar `CategoriesModule` nos imports |

---

## Tarefa 1: DTOs

**Arquivos:**
- Criar: `packages/api/src/modules/categories/dto/create-category.dto.ts`
- Criar: `packages/api/src/modules/categories/dto/update-category.dto.ts`
- Criar: `packages/api/src/modules/categories/dto/reorder-categories.dto.ts`
- Criar: `packages/api/src/modules/categories/dto/category-response.dto.ts`

- [ ] **Passo 1.1: Criar `create-category.dto.ts`**

```typescript
import { IsString, MinLength, MaxLength, IsOptional, IsInt, Min } from 'class-validator'

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string

  @IsOptional()
  @IsInt()
  @Min(1)
  displayOrder?: number
}
```

- [ ] **Passo 1.2: Criar `update-category.dto.ts`**

```typescript
import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator'

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string
}
```

- [ ] **Passo 1.3: Criar `reorder-categories.dto.ts`**

```typescript
import { IsArray, ArrayMinSize, ValidateNested, IsUUID, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class ReorderItemDto {
  @IsUUID()
  id!: string

  @IsInt()
  @Min(1)
  displayOrder!: number
}

export class ReorderCategoriesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items!: ReorderItemDto[]
}
```

- [ ] **Passo 1.4: Criar `category-response.dto.ts`**

```typescript
import { Expose, Type } from 'class-transformer'

class CategoryCountsDto {
  @Expose() judgesAssigned!: number
  @Expose() scoresRecorded!: number
}

export class CategoryResponseDto {
  @Expose() id!: string
  @Expose() eventId!: string
  @Expose() name!: string
  @Expose() displayOrder!: number

  @Expose()
  @Type(() => CategoryCountsDto)
  counts!: CategoryCountsDto
}
```

- [ ] **Passo 1.5: Commit**

```bash
git add packages/api/src/modules/categories/dto/
git commit -m "feat(api): adiciona DTOs de categorias"
```

---

## Tarefa 2: CategoriesRepository

**Arquivos:**
- Criar: `packages/api/src/modules/categories/categories.repository.ts`

- [ ] **Passo 2.1: Escrever teste unitário do repository (inline no service spec — validado via service)**

O repository será testado indiretamente pelos testes do service. Criar o arquivo:

```typescript
import { Injectable, Inject } from '@nestjs/common'
import { PrismaService } from '../../config/prisma.service'
import { Category, Prisma } from '@prisma/client'

export type CategoryWithCounts = Category & {
  _count: {
    judgeCategories: number
    scores: number
  }
}

@Injectable()
export class CategoriesRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return this.prisma.category.create({ data })
  }

  async findById(id: string): Promise<CategoryWithCounts | null> {
    return this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { judgeCategories: true, scores: true } },
      },
    })
  }

  async findByEventId(eventId: string): Promise<CategoryWithCounts[]> {
    return this.prisma.category.findMany({
      where: { eventId },
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: { select: { judgeCategories: true, scores: true } },
      },
    })
  }

  async findByEventIdAndName(eventId: string, name: string): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: { eventId_name: { eventId, name } },
    })
  }

  async maxDisplayOrder(eventId: string): Promise<number> {
    const result = await this.prisma.category.aggregate({
      where: { eventId },
      _max: { displayOrder: true },
    })
    return result._max.displayOrder ?? 0
  }

  async update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.category.delete({ where: { id } })
  }

  async countScores(categoryId: string): Promise<number> {
    return this.prisma.score.count({ where: { categoryId } })
  }

  async countTiebreakerRefs(categoryId: string): Promise<number> {
    return this.prisma.tiebreakerConfig.count({
      where: {
        OR: [
          { firstCategoryId: categoryId },
          { secondCategoryId: categoryId },
        ],
      },
    })
  }

  async reorderInTransaction(
    items: Array<{ id: string; displayOrder: number }>,
  ): Promise<void> {
    await this.prisma.$transaction(
      items.map(({ id, displayOrder }) =>
        this.prisma.category.update({ where: { id }, data: { displayOrder } }),
      ),
    )
  }

  async shiftDisplayOrderUp(eventId: string, fromOrder: number): Promise<void> {
    await this.prisma.category.updateMany({
      where: { eventId, displayOrder: { gte: fromOrder } },
      data: { displayOrder: { increment: 1 } },
    })
  }

  async compactDisplayOrder(eventId: string): Promise<void> {
    const categories = await this.prisma.category.findMany({
      where: { eventId },
      orderBy: { displayOrder: 'asc' },
      select: { id: true },
    })
    await this.prisma.$transaction(
      categories.map((cat, index) =>
        this.prisma.category.update({
          where: { id: cat.id },
          data: { displayOrder: index + 1 },
        }),
      ),
    )
  }
}
```

- [ ] **Passo 2.2: Commit**

```bash
git add packages/api/src/modules/categories/categories.repository.ts
git commit -m "feat(api): cria CategoriesRepository"
```

---

## Tarefa 3: CategoriesService — CRUD base e validações de status

**Arquivos:**
- Criar: `packages/api/src/modules/categories/categories.service.ts`

- [ ] **Passo 3.1: Criar `categories.service.ts`**

```typescript
import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { EventStatus } from '@prisma/client'
import { CategoriesRepository } from './categories.repository'
import { EventsRepository } from '../events/events.repository'
import { AuditService } from '../audit/audit.service'
import { AppException } from '../../common/exceptions/app.exception'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { ReorderCategoriesDto } from './dto/reorder-categories.dto'
import { CategoryResponseDto } from './dto/category-response.dto'
import { plainToInstance } from 'class-transformer'

function toCategoryResponse(cat: import('./categories.repository').CategoryWithCounts): CategoryResponseDto {
  return plainToInstance(
    CategoryResponseDto,
    {
      ...cat,
      counts: {
        judgesAssigned: cat._count.judgeCategories,
        scoresRecorded: cat._count.scores,
      },
    },
    { excludeExtraneousValues: true },
  )
}

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(CategoriesRepository) private readonly repository: CategoriesRepository,
    @Inject(EventsRepository) private readonly eventsRepository: EventsRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  private async getEventOrThrow(eventId: string, managerId: string) {
    const event = await this.eventsRepository.findById(eventId, managerId)
    if (!event) throw new NotFoundException('Evento não encontrado')
    return event
  }

  private assertEventMutable(status: EventStatus): void {
    if (status === EventStatus.FINISHED) {
      throw new AppException('Evento finalizado não pode ser alterado', 400, 'EVENT_FINISHED')
    }
    if (status === EventStatus.IN_PROGRESS) {
      throw new AppException(
        'Evento em andamento não permite alterações nas categorias',
        400,
        'EVENT_IN_PROGRESS_LOCK',
      )
    }
  }

  async create(
    eventId: string,
    dto: CreateCategoryDto,
    managerId: string,
  ): Promise<CategoryResponseDto> {
    const event = await this.getEventOrThrow(eventId, managerId)
    this.assertEventMutable(event.status)

    const existing = await this.repository.findByEventIdAndName(eventId, dto.name)
    if (existing) {
      throw new AppException('Já existe uma categoria com esse nome neste evento', 409, 'CATEGORY_NAME_CONFLICT')
    }

    let displayOrder = dto.displayOrder
    if (displayOrder === undefined) {
      displayOrder = (await this.repository.maxDisplayOrder(eventId)) + 1
    } else {
      await this.repository.shiftDisplayOrderUp(eventId, displayOrder)
    }

    const category = await this.repository.create({
      name: dto.name,
      displayOrder,
      event: { connect: { id: eventId } },
    })

    await this.auditService.record({
      action: 'CATEGORY_CREATED',
      entityType: 'Category',
      entityId: category.id,
      actorId: managerId,
      payload: { eventId, name: dto.name, displayOrder },
    })

    const withCounts = await this.repository.findById(category.id)
    return toCategoryResponse(withCounts!)
  }

  async list(eventId: string, managerId: string): Promise<CategoryResponseDto[]> {
    await this.getEventOrThrow(eventId, managerId)
    const categories = await this.repository.findByEventId(eventId)
    return categories.map(toCategoryResponse)
  }

  async findById(
    id: string,
    eventId: string,
    managerId: string,
  ): Promise<CategoryResponseDto> {
    await this.getEventOrThrow(eventId, managerId)
    const category = await this.repository.findById(id)
    if (!category || category.eventId !== eventId) {
      throw new NotFoundException('Categoria não encontrada')
    }
    return toCategoryResponse(category)
  }

  async update(
    id: string,
    eventId: string,
    dto: UpdateCategoryDto,
    managerId: string,
  ): Promise<CategoryResponseDto> {
    const event = await this.getEventOrThrow(eventId, managerId)
    this.assertEventMutable(event.status)

    const category = await this.repository.findById(id)
    if (!category || category.eventId !== eventId) {
      throw new NotFoundException('Categoria não encontrada')
    }

    if (dto.name && dto.name !== category.name) {
      const existing = await this.repository.findByEventIdAndName(eventId, dto.name)
      if (existing) {
        throw new AppException('Já existe uma categoria com esse nome neste evento', 409, 'CATEGORY_NAME_CONFLICT')
      }
    }

    const updated = await this.repository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
    })

    await this.auditService.record({
      action: 'CATEGORY_UPDATED',
      entityType: 'Category',
      entityId: id,
      actorId: managerId,
      payload: { before: { name: category.name }, after: dto },
    })

    const withCounts = await this.repository.findById(updated.id)
    return toCategoryResponse(withCounts!)
  }

  async remove(id: string, eventId: string, managerId: string): Promise<void> {
    const event = await this.getEventOrThrow(eventId, managerId)
    this.assertEventMutable(event.status)

    const category = await this.repository.findById(id)
    if (!category || category.eventId !== eventId) {
      throw new NotFoundException('Categoria não encontrada')
    }

    const scoreCount = await this.repository.countScores(id)
    if (scoreCount > 0) {
      throw new AppException(
        'Categoria possui notas registradas e não pode ser removida',
        422,
        'CATEGORY_HAS_SCORES',
      )
    }

    const tiebreakerCount = await this.repository.countTiebreakerRefs(id)
    if (tiebreakerCount > 0) {
      throw new AppException(
        'Categoria está referenciada no tiebreaker. Remova do tiebreaker antes de deletar.',
        422,
        'CATEGORY_REFERENCED_BY_TIEBREAKER',
      )
    }

    await this.repository.delete(id)
    await this.repository.compactDisplayOrder(eventId)

    await this.auditService.record({
      action: 'CATEGORY_DELETED',
      entityType: 'Category',
      entityId: id,
      actorId: managerId,
      payload: { eventId, name: category.name },
    })
  }

  async reorder(
    eventId: string,
    dto: ReorderCategoriesDto,
    managerId: string,
  ): Promise<CategoryResponseDto[]> {
    const event = await this.getEventOrThrow(eventId, managerId)
    this.assertEventMutable(event.status)

    const allCategories = await this.repository.findByEventId(eventId)
    const eventCategoryIds = new Set(allCategories.map(c => c.id))

    for (const item of dto.items) {
      if (!eventCategoryIds.has(item.id)) {
        throw new AppException(
          `Categoria ${item.id} não pertence a este evento`,
          400,
          'CATEGORY_NOT_IN_EVENT',
        )
      }
    }

    const orders = dto.items.map(i => i.displayOrder)
    const uniqueOrders = new Set(orders)
    if (uniqueOrders.size !== orders.length) {
      throw new AppException(
        'displayOrder deve ser único para cada categoria',
        400,
        'CATEGORY_DUPLICATE_ORDER',
      )
    }

    await this.repository.reorderInTransaction(dto.items)
    await this.repository.compactDisplayOrder(eventId)

    await this.auditService.record({
      action: 'CATEGORIES_REORDERED',
      entityType: 'Category',
      entityId: eventId,
      actorId: managerId,
      payload: { items: dto.items },
    })

    return this.list(eventId, managerId)
  }
}
```

- [ ] **Passo 3.2: Commit**

```bash
git add packages/api/src/modules/categories/categories.service.ts
git commit -m "feat(api): implementa CategoriesService com CRUD e validações de status"
```

---

## Tarefa 4: CategoriesController

**Arquivos:**
- Criar: `packages/api/src/modules/categories/categories.controller.ts`

- [ ] **Passo 4.1: Criar `categories.controller.ts`**

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common'
import { CategoriesService } from './categories.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { ReorderCategoriesDto } from './dto/reorder-categories.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtPayload } from '../auth/types/jwt-payload.type'

@Roles('GESTOR')
@Controller('events/:eventId/categories')
export class CategoriesController {
  constructor(
    @Inject(CategoriesService) private readonly categoriesService: CategoriesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('eventId') eventId: string,
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.categoriesService.create(eventId, dto, user.sub)
  }

  @Get()
  async list(@Param('eventId') eventId: string, @CurrentUser() user: JwtPayload) {
    return this.categoriesService.list(eventId, user.sub)
  }

  @Patch('reorder')
  async reorder(
    @Param('eventId') eventId: string,
    @Body() dto: ReorderCategoriesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.categoriesService.reorder(eventId, dto, user.sub)
  }

  @Get(':id')
  async findOne(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.categoriesService.findById(id, eventId, user.sub)
  }

  @Patch(':id')
  async update(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.categoriesService.update(id, eventId, dto, user.sub)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.categoriesService.remove(id, eventId, user.sub)
  }
}
```

**Nota:** A rota `PATCH reorder` deve ser declarada ANTES de `PATCH :id` para evitar conflito de rota no Fastify.

- [ ] **Passo 4.2: Commit**

```bash
git add packages/api/src/modules/categories/categories.controller.ts
git commit -m "feat(api): cria CategoriesController com rotas aninhadas em events"
```

---

## Tarefa 5: CategoriesModule + registro no AppModule

**Arquivos:**
- Criar: `packages/api/src/modules/categories/categories.module.ts`
- Modificar: `packages/api/src/app.module.ts`

- [ ] **Passo 5.1: Criar `categories.module.ts`**

```typescript
import { Module } from '@nestjs/common'
import { CategoriesController } from './categories.controller'
import { CategoriesService } from './categories.service'
import { CategoriesRepository } from './categories.repository'
import { EventsModule } from '../events/events.module'
import { AuditModule } from '../audit/audit.module'

@Module({
  imports: [EventsModule, AuditModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoriesRepository],
  exports: [CategoriesService],
})
export class CategoriesModule {}
```

- [ ] **Passo 5.2: Adicionar `CategoriesModule` no `app.module.ts`**

No arquivo `packages/api/src/app.module.ts`, adicionar o import:

```typescript
import { CategoriesModule } from './modules/categories/categories.module'
```

E adicionar `CategoriesModule` no array `imports` do `@Module`, após `EventsModule`.

- [ ] **Passo 5.3: Verificar que compila**

```bash
cd packages/api && pnpm type-check
```

Esperado: sem erros de tipo.

- [ ] **Passo 5.4: Commit**

```bash
git add packages/api/src/modules/categories/categories.module.ts packages/api/src/app.module.ts
git commit -m "feat(api): adiciona regras de proteção contra remoção (scores e tiebreaker)"
```

---

## Tarefa 6: Testes unitários — CategoriesService

**Arquivos:**
- Criar: `packages/api/src/modules/categories/__tests__/categories.service.spec.ts`

- [ ] **Passo 6.1: Criar o arquivo de teste**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { EventStatus } from '@prisma/client'
import { CategoriesService } from '../categories.service'
import { CategoriesRepository } from '../categories.repository'
import { EventsRepository } from '../../events/events.repository'
import { AuditService } from '../../audit/audit.service'
import { AppException } from '../../../common/exceptions/app.exception'

const makeEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 'event-1',
  managerId: 'manager-1',
  status: EventStatus.DRAFT,
  ...overrides,
})

const makeCategory = (overrides: Record<string, unknown> = {}) => ({
  id: 'cat-1',
  eventId: 'event-1',
  name: 'Técnica Vocal',
  displayOrder: 1,
  _count: { judgeCategories: 0, scores: 0 },
  ...overrides,
})

describe('CategoriesService', () => {
  let service: CategoriesService
  let repository: any
  let eventsRepository: any
  let auditService: any

  beforeEach(async () => {
    repository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByEventId: vi.fn(),
      findByEventIdAndName: vi.fn(),
      maxDisplayOrder: vi.fn().mockResolvedValue(0),
      update: vi.fn(),
      delete: vi.fn(),
      countScores: vi.fn().mockResolvedValue(0),
      countTiebreakerRefs: vi.fn().mockResolvedValue(0),
      reorderInTransaction: vi.fn(),
      shiftDisplayOrderUp: vi.fn(),
      compactDisplayOrder: vi.fn(),
    }

    eventsRepository = {
      findById: vi.fn(),
    }

    auditService = { record: vi.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: CategoriesRepository, useValue: repository },
        { provide: EventsRepository, useValue: eventsRepository },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile()

    service = module.get<CategoriesService>(CategoriesService)
  })

  describe('create', () => {
    it('cria categoria em evento DRAFT sem displayOrder → atribui MAX+1', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findByEventIdAndName.mockResolvedValue(null)
      repository.maxDisplayOrder.mockResolvedValue(2)
      const created = { id: 'cat-new', eventId: 'event-1', name: 'Nova', displayOrder: 3 }
      repository.create.mockResolvedValue(created)
      repository.findById.mockResolvedValue({ ...created, _count: { judgeCategories: 0, scores: 0 } })

      const res = await service.create('event-1', { name: 'Nova' }, 'manager-1')

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ displayOrder: 3 }),
      )
      expect(res.displayOrder).toBe(3)
    })

    it('cria com displayOrder fornecido → empurra posteriores', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findByEventIdAndName.mockResolvedValue(null)
      const created = { id: 'cat-new', eventId: 'event-1', name: 'Nova', displayOrder: 1 }
      repository.create.mockResolvedValue(created)
      repository.findById.mockResolvedValue({ ...created, _count: { judgeCategories: 0, scores: 0 } })

      await service.create('event-1', { name: 'Nova', displayOrder: 1 }, 'manager-1')

      expect(repository.shiftDisplayOrderUp).toHaveBeenCalledWith('event-1', 1)
    })

    it('lança AppException EVENT_IN_PROGRESS_LOCK em evento IN_PROGRESS', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))

      await expect(
        service.create('event-1', { name: 'Nova' }, 'manager-1'),
      ).rejects.toMatchObject({ code: undefined, response: expect.objectContaining({ code: 'EVENT_IN_PROGRESS_LOCK' }) })
    })

    it('lança AppException EVENT_FINISHED em evento FINISHED', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.FINISHED }))

      await expect(
        service.create('event-1', { name: 'Nova' }, 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'EVENT_FINISHED')
    })

    it('lança AppException CATEGORY_NAME_CONFLICT com nome duplicado', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findByEventIdAndName.mockResolvedValue(makeCategory())

      await expect(
        service.create('event-1', { name: 'Técnica Vocal' }, 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'CATEGORY_NAME_CONFLICT')
    })

    it('lança NotFoundException para evento de outro gestor', async () => {
      eventsRepository.findById.mockResolvedValue(null)

      await expect(
        service.create('event-1', { name: 'Nova' }, 'outro-manager'),
      ).rejects.toThrow(NotFoundException)
    })

    it('registra auditoria CATEGORY_CREATED após criação', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findByEventIdAndName.mockResolvedValue(null)
      repository.maxDisplayOrder.mockResolvedValue(0)
      const created = { id: 'cat-new', eventId: 'event-1', name: 'Nova', displayOrder: 1 }
      repository.create.mockResolvedValue(created)
      repository.findById.mockResolvedValue({ ...created, _count: { judgeCategories: 0, scores: 0 } })

      await service.create('event-1', { name: 'Nova' }, 'manager-1')

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CATEGORY_CREATED' }),
      )
    })
  })

  describe('list', () => {
    it('retorna categorias ordenadas por displayOrder', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findByEventId.mockResolvedValue([
        makeCategory({ displayOrder: 1 }),
        makeCategory({ id: 'cat-2', name: 'Apresentação', displayOrder: 2 }),
      ])

      const result = await service.list('event-1', 'manager-1')

      expect(result).toHaveLength(2)
      expect(result[0].displayOrder).toBe(1)
      expect(result[1].displayOrder).toBe(2)
    })
  })

  describe('update', () => {
    it('atualiza nome com sucesso em evento DRAFT', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findById.mockResolvedValue(makeCategory())
      repository.findByEventIdAndName.mockResolvedValue(null)
      const updated = { id: 'cat-1', eventId: 'event-1', name: 'Novo Nome', displayOrder: 1 }
      repository.update.mockResolvedValue(updated)
      repository.findById
        .mockResolvedValueOnce(makeCategory())
        .mockResolvedValueOnce({ ...updated, _count: { judgeCategories: 0, scores: 0 } })

      const res = await service.update('cat-1', 'event-1', { name: 'Novo Nome' }, 'manager-1')

      expect(res.name).toBe('Novo Nome')
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CATEGORY_UPDATED' }),
      )
    })

    it('lança AppException EVENT_IN_PROGRESS_LOCK ao tentar atualizar em evento IN_PROGRESS', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))

      await expect(
        service.update('cat-1', 'event-1', { name: 'X' }, 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'EVENT_IN_PROGRESS_LOCK')
    })
  })

  describe('remove', () => {
    it('remove categoria sem scores e sem tiebreaker, recompacta displayOrder', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findById.mockResolvedValue(makeCategory())
      repository.countScores.mockResolvedValue(0)
      repository.countTiebreakerRefs.mockResolvedValue(0)

      await service.remove('cat-1', 'event-1', 'manager-1')

      expect(repository.delete).toHaveBeenCalledWith('cat-1')
      expect(repository.compactDisplayOrder).toHaveBeenCalledWith('event-1')
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CATEGORY_DELETED' }),
      )
    })

    it('lança AppException CATEGORY_HAS_SCORES quando há scores', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findById.mockResolvedValue(makeCategory())
      repository.countScores.mockResolvedValue(3)

      await expect(
        service.remove('cat-1', 'event-1', 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'CATEGORY_HAS_SCORES')
    })

    it('lança AppException CATEGORY_REFERENCED_BY_TIEBREAKER quando referenciada', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findById.mockResolvedValue(makeCategory())
      repository.countScores.mockResolvedValue(0)
      repository.countTiebreakerRefs.mockResolvedValue(1)

      await expect(
        service.remove('cat-1', 'event-1', 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'CATEGORY_REFERENCED_BY_TIEBREAKER')
    })

    it('lança AppException EVENT_IN_PROGRESS_LOCK em evento IN_PROGRESS', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))

      await expect(
        service.remove('cat-1', 'event-1', 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'EVENT_IN_PROGRESS_LOCK')
    })
  })

  describe('reorder', () => {
    it('reordena com IDs válidos do evento atomicamente', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findByEventId.mockResolvedValue([
        makeCategory({ id: 'cat-1', displayOrder: 1 }),
        makeCategory({ id: 'cat-2', name: 'Apresentação', displayOrder: 2 }),
      ])
      repository.reorderInTransaction.mockResolvedValue(undefined)
      repository.compactDisplayOrder.mockResolvedValue(undefined)

      // Segunda chamada para list() ao final
      repository.findByEventId.mockResolvedValueOnce([
        makeCategory({ id: 'cat-1', displayOrder: 1 }),
        makeCategory({ id: 'cat-2', name: 'Apresentação', displayOrder: 2 }),
      ]).mockResolvedValueOnce([
        makeCategory({ id: 'cat-2', name: 'Apresentação', displayOrder: 1 }),
        makeCategory({ id: 'cat-1', displayOrder: 2 }),
      ])

      const dto = { items: [{ id: 'cat-2', displayOrder: 1 }, { id: 'cat-1', displayOrder: 2 }] }
      await service.reorder('event-1', dto, 'manager-1')

      expect(repository.reorderInTransaction).toHaveBeenCalledWith(dto.items)
      expect(repository.compactDisplayOrder).toHaveBeenCalledWith('event-1')
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CATEGORIES_REORDERED' }),
      )
    })

    it('lança AppException CATEGORY_NOT_IN_EVENT para ID de outro evento', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findByEventId.mockResolvedValue([
        makeCategory({ id: 'cat-1', displayOrder: 1 }),
      ])

      const dto = { items: [{ id: 'cat-outro-evento', displayOrder: 1 }] }

      await expect(
        service.reorder('event-1', dto, 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'CATEGORY_NOT_IN_EVENT')
    })
  })
})
```

- [ ] **Passo 6.2: Executar e verificar**

```bash
cd packages/api && pnpm vitest run src/modules/categories/__tests__/categories.service.spec.ts
```

Esperado: todos os testes passam.

- [ ] **Passo 6.3: Commit**

```bash
git add packages/api/src/modules/categories/__tests__/categories.service.spec.ts
git commit -m "test(api): adiciona testes unitários do CategoriesService"
```

---

## Tarefa 7: Testes unitários — CategoriesController

**Arquivos:**
- Criar: `packages/api/src/modules/categories/__tests__/categories.controller.spec.ts`

- [ ] **Passo 7.1: Criar o arquivo de teste**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { CategoriesController } from '../categories.controller'
import { CategoriesService } from '../categories.service'

const mockCategory = {
  id: 'cat-1',
  eventId: 'event-1',
  name: 'Técnica Vocal',
  displayOrder: 1,
  counts: { judgesAssigned: 0, scoresRecorded: 0 },
}

describe('CategoriesController', () => {
  let controller: CategoriesController
  let service: any

  beforeEach(async () => {
    service = {
      create: vi.fn().mockResolvedValue(mockCategory),
      list: vi.fn().mockResolvedValue([mockCategory]),
      findById: vi.fn().mockResolvedValue(mockCategory),
      update: vi.fn().mockResolvedValue({ ...mockCategory, name: 'Novo Nome' }),
      remove: vi.fn().mockResolvedValue(undefined),
      reorder: vi.fn().mockResolvedValue([mockCategory]),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [{ provide: CategoriesService, useValue: service }],
    }).compile()

    controller = module.get<CategoriesController>(CategoriesController)
  })

  it('create: chama service.create com eventId, dto e managerId', async () => {
    const res = await controller.create('event-1', { name: 'Técnica Vocal' }, { sub: 'manager-1' } as never)
    expect(res.id).toBe('cat-1')
    expect(service.create).toHaveBeenCalledWith('event-1', { name: 'Técnica Vocal' }, 'manager-1')
  })

  it('list: retorna array de categorias', async () => {
    const res = await controller.list('event-1', { sub: 'manager-1' } as never)
    expect(res).toHaveLength(1)
    expect(service.list).toHaveBeenCalledWith('event-1', 'manager-1')
  })

  it('findOne: chama service.findById com id, eventId e managerId', async () => {
    const res = await controller.findOne('event-1', 'cat-1', { sub: 'manager-1' } as never)
    expect(res.id).toBe('cat-1')
    expect(service.findById).toHaveBeenCalledWith('cat-1', 'event-1', 'manager-1')
  })

  it('update: chama service.update e retorna categoria atualizada', async () => {
    const res = await controller.update('event-1', 'cat-1', { name: 'Novo Nome' }, { sub: 'manager-1' } as never)
    expect(res.name).toBe('Novo Nome')
    expect(service.update).toHaveBeenCalledWith('cat-1', 'event-1', { name: 'Novo Nome' }, 'manager-1')
  })

  it('remove: chama service.remove sem retorno', async () => {
    const res = await controller.remove('event-1', 'cat-1', { sub: 'manager-1' } as never)
    expect(res).toBeUndefined()
    expect(service.remove).toHaveBeenCalledWith('cat-1', 'event-1', 'manager-1')
  })

  it('reorder: chama service.reorder e retorna lista reordenada', async () => {
    const dto = { items: [{ id: 'cat-1', displayOrder: 1 }] }
    const res = await controller.reorder('event-1', dto, { sub: 'manager-1' } as never)
    expect(res).toHaveLength(1)
    expect(service.reorder).toHaveBeenCalledWith('event-1', dto, 'manager-1')
  })
})
```

- [ ] **Passo 7.2: Executar e verificar**

```bash
cd packages/api && pnpm vitest run src/modules/categories/__tests__/categories.controller.spec.ts
```

Esperado: todos os 6 testes passam.

- [ ] **Passo 7.3: Commit**

```bash
git add packages/api/src/modules/categories/__tests__/categories.controller.spec.ts
git commit -m "test(api): adiciona testes unitários do CategoriesController"
```

---

## Tarefa 8: Cobertura, lint e type-check

- [ ] **Passo 8.1: Rodar suite completa com cobertura**

```bash
cd packages/api && pnpm test:ci
```

Esperado: cobertura ≥ 80% em statements, branches, functions e lines. Todos os testes passam.

- [ ] **Passo 8.2: Lint**

```bash
cd packages/api && pnpm lint
```

Esperado: sem erros.

- [ ] **Passo 8.3: Type-check**

```bash
cd packages/api && pnpm type-check
```

Esperado: sem erros.

- [ ] **Passo 8.4: Se cobertura abaixo de 80%, verificar gaps**

```bash
cd packages/api && pnpm vitest run --coverage 2>&1 | grep -E "All files|categories"
```

Adicionar testes adicionais conforme necessário para cobrir branches não testados.

---

## Tarefa 9: Atualizar PROJECT_PROGRESS.md e commit final

**Arquivos:**
- Modificar: `PROJECT_PROGRESS.md` (raiz do monorepo)

- [ ] **Passo 9.1: Marcar P08 como concluído no PROJECT_PROGRESS.md**

Localizar a linha do P08 e marcar `[x]`. Preencher campos:
- Branch: `feature/p08-modulo-categories`
- Cobertura: valores reais do output do `test:ci`
- Decisões técnicas: rota `reorder` declarada antes de `:id` para evitar conflito Fastify; `compactDisplayOrder` em transação após remoção

Atualizar também:
- "Prompts concluídos: 9 de 20"
- Próximo: P09

- [ ] **Passo 9.2: Commit do progress**

```bash
git add PROJECT_PROGRESS.md
git commit -m "docs(progress): conclui P08 — Módulo categories"
```

---

## Tarefa 10: Pull Request

- [ ] **Passo 10.1: Verificar git log**

```bash
git log --oneline feature/p08-modulo-categories ^develop
```

Esperado: commits da feature listados.

- [ ] **Passo 10.2: Criar PR via GitHub CLI**

```bash
gh pr create \
  --title "P08: Módulo categories" \
  --base develop \
  --body "$(cat .github/pull_request_template.md)"
```

Se não houver template, usar:

```bash
gh pr create \
  --title "P08: Módulo categories" \
  --base develop \
  --body "## Resumo

- CRUD aninhado em \`/api/events/:eventId/categories\`
- Reordenação atômica via \`PATCH /reorder\`
- Bloqueio em IN_PROGRESS e FINISHED
- Proteção de remoção com scores ou tiebreaker
- Compactação de \`displayOrder\` após remoção
- Isolamento por gestor (404 para evento alheio)
- Auditoria em todas as escritas

## Checklist
- [ ] Critérios de aceitação marcados
- [ ] \`pnpm lint && pnpm type-check && pnpm test:ci\` verde
- [ ] PROJECT_PROGRESS.md atualizado"
```

---

## Self-Review — Cobertura do Spec

| Requisito do spec | Tarefa que implementa |
|---|---|
| POST /categories | Tarefa 4, 7 |
| GET /categories | Tarefa 4, 7 |
| GET /categories/:id | Tarefa 4, 7 |
| PATCH /categories/:id | Tarefa 4, 7 |
| DELETE /categories/:id | Tarefa 4, 7 |
| PATCH /categories/reorder | Tarefa 4, 7 |
| Isolamento por gestor | Tarefa 3 (`getEventOrThrow`) |
| Bloqueio IN_PROGRESS | Tarefa 3 (`assertEventMutable`) |
| Bloqueio FINISHED | Tarefa 3 (`assertEventMutable`) |
| Nome único por evento | Tarefa 3 (`findByEventIdAndName`) |
| CATEGORY_HAS_SCORES | Tarefa 3 (`countScores`) |
| CATEGORY_REFERENCED_BY_TIEBREAKER | Tarefa 3 (`countTiebreakerRefs`) |
| Compactação displayOrder | Tarefa 2 (`compactDisplayOrder`) |
| Reordenação atômica | Tarefa 2 (`reorderInTransaction`) |
| displayOrder MAX+1 se omitido | Tarefa 3 (`maxDisplayOrder`) |
| Auditoria CATEGORY_CREATED | Tarefa 3 |
| Auditoria CATEGORY_UPDATED | Tarefa 3 |
| Auditoria CATEGORY_DELETED | Tarefa 3 |
| Auditoria CATEGORIES_REORDERED | Tarefa 3 |
| counts.judgesAssigned | Tarefa 1 (DTO), Tarefa 2 (repository) |
| counts.scoresRecorded | Tarefa 1 (DTO), Tarefa 2 (repository) |
| @Roles('GESTOR') | Tarefa 4 |
| @Inject explícito | Tarefa 3, 4 (padrão SWC) |
| ≥ 80% cobertura | Tarefa 8 |
| Lint + type-check | Tarefa 8 |
| PROJECT_PROGRESS.md | Tarefa 9 |
| Pull Request | Tarefa 10 |
