import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common'
import { EventStatus } from '@prisma/client'
import { CategoriesRepository, CategoryWithCounts } from './categories.repository'
import { EventsRepository } from '../events/events.repository'
import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../../config/prisma.service'
import { AppException } from '../../common/exceptions/app.exception'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { ReorderCategoriesDto } from './dto/reorder-categories.dto'
import { CategoryResponseDto } from './dto/category-response.dto'
import { plainToInstance } from 'class-transformer'

function toCategoryResponse(cat: CategoryWithCounts): CategoryResponseDto {
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
    @Inject(PrismaService) private readonly prisma: PrismaService,
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
    }

    const category = await this.prisma.$transaction(async (tx) => {
      if (dto.displayOrder !== undefined) {
        await this.repository.shiftDisplayOrderUp(eventId, displayOrder, tx)
      }

      const created = await this.repository.create({
        name: dto.name,
        displayOrder,
        event: { connect: { id: eventId } },
      }, tx)

      await this.auditService.record({
        action: 'CATEGORY_CREATED',
        entityType: 'Category',
        entityId: created.id,
        actorId: managerId,
        payload: { eventId, name: dto.name, displayOrder },
      }, tx)

      return created
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

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await this.repository.update(id, {
        ...(dto.name !== undefined && { name: dto.name }),
      }, tx)

      await this.auditService.record({
        action: 'CATEGORY_UPDATED',
        entityType: 'Category',
        entityId: id,
        actorId: managerId,
        payload: { before: { name: category.name }, after: dto },
      }, tx)

      return result
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

    await this.prisma.$transaction(async (tx) => {
      await this.repository.delete(id, tx)
      await this.repository.compactDisplayOrder(eventId, tx)

      await this.auditService.record({
        action: 'CATEGORY_DELETED',
        entityType: 'Category',
        entityId: id,
        actorId: managerId,
        payload: { eventId, name: category.name },
      }, tx)
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

    await this.prisma.$transaction(async (tx) => {
      await this.repository.reorderInTransaction(dto.items, tx)
      await this.repository.compactDisplayOrder(eventId, tx)

      await this.auditService.record({
        action: 'CATEGORIES_REORDERED',
        entityType: 'Category',
        entityId: eventId,
        actorId: managerId,
        payload: { items: dto.items },
      }, tx)
    })

    return this.list(eventId, managerId)
  }
}
