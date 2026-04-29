import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { EventsRepository, EventWithRelations } from './events.repository'
import { AuditService } from '../audit/audit.service'
import { CreateEventDto } from './dto/create-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'
import { UpdateTiebreakerDto } from './dto/update-tiebreaker.dto'
import { TransitionEventDto } from './dto/transition-event.dto'
import { ListEventsDto } from './dto/list-events.dto'
import { EventResponseDto, TiebreakerConfigDto } from './dto/event-response.dto'
import { EventStateMachine } from './state-machine/event-state.machine'
import { EventStatus, CalculationRule } from '@prisma/client'
import { plainToInstance } from 'class-transformer'
import { ScoringGateway } from '../scoring/scoring.gateway'
import { PublicLiveGateway } from '../scoring/public-live.gateway'

const KNOWN_PLACEHOLDERS = ['{{participante}}', '{{evento}}', '{{data}}', '{{local}}', '{{organizador}}']

function toEventResponse(event: EventWithRelations): EventResponseDto {
  const tiebreaker = event.tiebreakerConfig
    ? plainToInstance(TiebreakerConfigDto, event.tiebreakerConfig, {
        excludeExtraneousValues: true,
      })
    : null

  return plainToInstance(
    EventResponseDto,
    {
      ...event,
      scoreMin: Number(event.scoreMin),
      scoreMax: Number(event.scoreMax),
      eventDate: event.eventDate instanceof Date ? event.eventDate.toISOString() : event.eventDate,
      createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt,
      updatedAt: event.updatedAt instanceof Date ? event.updatedAt.toISOString() : event.updatedAt,
      deletedAt: event.deletedAt instanceof Date ? event.deletedAt.toISOString() : event.deletedAt ?? null,
      tiebreaker,
      counts: event._count,
    },
    { excludeExtraneousValues: true },
  )
}

@Injectable()
export class EventsService {
  private readonly stateMachine = new EventStateMachine()

  constructor(
    @Inject(EventsRepository) private readonly repository: EventsRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(ScoringGateway) private readonly scoringGateway: ScoringGateway,
    @Inject(PublicLiveGateway) private readonly publicGateway: PublicLiveGateway,
  ) {}

  async create(dto: CreateEventDto, managerId: string): Promise<EventResponseDto> {
    if (dto.scoreMin >= dto.scoreMax) {
      throw new BadRequestException('scoreMin deve ser menor que scoreMax')
    }

    const event = await this.repository.create({
      name: dto.name,
      eventDate: dto.eventDate,
      location: dto.location,
      organizer: dto.organizer,
      calculationRule: dto.calculationRule,
      scoreMin: dto.scoreMin,
      scoreMax: dto.scoreMax,
      topN: dto.topN,
      status: EventStatus.DRAFT,
      manager: { connect: { id: managerId } },
    })

    await this.auditService.record({
      action: 'EVENT_CREATED',
      entityType: 'JudgingEvent',
      entityId: event.id,
      actorId: managerId,
      payload: { name: event.name, calculationRule: event.calculationRule },
    })

    return toEventResponse(event)
  }

  async findById(id: string, managerId: string): Promise<EventResponseDto> {
    const event = await this.repository.findById(id, managerId)
    if (!event) throw new NotFoundException('Evento não encontrado')
    return toEventResponse(event)
  }

  async list(
    filters: ListEventsDto,
    managerId: string,
  ): Promise<{ data: EventResponseDto[]; meta: object }> {
    const { data, total } = await this.repository.list(filters, managerId)
    const page = filters.page ?? 1
    const pageSize = filters.pageSize ?? 20
    return {
      data: data.map(toEventResponse),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }

  async update(id: string, dto: UpdateEventDto, managerId: string): Promise<EventResponseDto> {
    const event = await this.repository.findById(id, managerId)
    if (!event) throw new NotFoundException('Evento não encontrado')

    if (event.status === EventStatus.FINISHED) {
      throw new BadRequestException('Evento finalizado não pode ser alterado')
    }

    if (event.status === EventStatus.IN_PROGRESS) {
      const restrictedFields = ['calculationRule', 'scoreMin', 'scoreMax', 'topN', 'eventDate', 'organizer'] as const
      for (const field of restrictedFields) {
        if (dto[field] !== undefined) {
          throw new BadRequestException(
            `Campo "${field}" não pode ser alterado com o evento em andamento`,
          )
        }
      }
    }

    if (event.status !== EventStatus.DRAFT) {
      if (dto.calculationRule !== undefined) {
        throw new BadRequestException('calculationRule só pode ser alterado em status DRAFT')
      }
      if (dto.scoreMin !== undefined || dto.scoreMax !== undefined) {
        throw new BadRequestException('scoreMin e scoreMax só podem ser alterados em status DRAFT')
      }
    }

    const newMin = dto.scoreMin ?? Number(event.scoreMin)
    const newMax = dto.scoreMax ?? Number(event.scoreMax)
    if (newMin >= newMax) {
      throw new BadRequestException('scoreMin deve ser menor que scoreMax')
    }

    const before = { name: event.name, location: event.location, status: event.status }
    const updated = await this.repository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.eventDate !== undefined && { eventDate: dto.eventDate }),
      ...(dto.location !== undefined && { location: dto.location }),
      ...(dto.organizer !== undefined && { organizer: dto.organizer }),
      ...(dto.calculationRule !== undefined && { calculationRule: dto.calculationRule }),
      ...(dto.scoreMin !== undefined && { scoreMin: dto.scoreMin }),
      ...(dto.scoreMax !== undefined && { scoreMax: dto.scoreMax }),
      ...(dto.topN !== undefined && { topN: dto.topN }),
    })

    await this.auditService.record({
      action: 'EVENT_UPDATED',
      entityType: 'JudgingEvent',
      entityId: id,
      actorId: managerId,
      payload: { before, after: { name: updated.name, location: updated.location } },
    })

    return toEventResponse(updated)
  }

  async softDelete(id: string, managerId: string): Promise<void> {
    const event = await this.repository.findById(id, managerId)
    if (!event) throw new NotFoundException('Evento não encontrado')

    if (event.status === EventStatus.IN_PROGRESS || event.status === EventStatus.REGISTERING) {
      throw new BadRequestException('Evento em andamento ou com inscrições abertas não pode ser excluído')
    }

    await this.repository.softDelete(id)

    await this.auditService.record({
      action: 'EVENT_DELETED',
      entityType: 'JudgingEvent',
      entityId: id,
      actorId: managerId,
      payload: { status: event.status },
    })
  }

  async transition(
    id: string,
    dto: TransitionEventDto,
    managerId: string,
  ): Promise<EventResponseDto> {
    const event = await this.repository.findById(id, managerId)
    if (!event) throw new NotFoundException('Evento não encontrado')

    const [categoryCount, judgeCount, participantCount, pendingIds, categoriesWithFewJudges] =
      await Promise.all([
        this.repository.countCategoriesForEvent(id),
        this.repository.countJudgesForEvent(id),
        this.repository.countParticipantsForEvent(id),
        this.repository.findPendingParticipants(id),
        event.calculationRule === CalculationRule.R2
          ? this.repository.findCategoriesWithFewJudges(id, 3)
          : Promise.resolve([]),
      ])

    const result = await this.stateMachine.validateTransition(event.status, dto.targetStatus, {
      categoryCount,
      judgeCount,
      participantCount,
      pendingParticipantIds: pendingIds,
      categoriesWithFewJudges,
      acknowledgeR2Coverage: dto.acknowledgeR2Coverage,
      calculationRule: event.calculationRule,
    })

    if (!result.allowed) {
      throw new UnprocessableEntityException({
        message: 'Transição de status não permitida',
        errors: result.errors,
      })
    }

    const updated = await this.repository.updateStatus(id, dto.targetStatus)

    if (dto.targetStatus === EventStatus.FINISHED) {
      this.scoringGateway.emitToEvent(id, 'event_state_changed', {
        eventId: id,
        status: EventStatus.FINISHED,
      })
      this.publicGateway.emitToEvent(id, 'public_event_state_changed', {
        status: EventStatus.FINISHED,
      })
      this.publicGateway.emitToEvent(id, 'public_event_finished', {})
    }

    await this.auditService.record({
      action: 'EVENT_STATUS_CHANGED',
      entityType: 'JudgingEvent',
      entityId: id,
      actorId: managerId,
      payload: {
        from: event.status,
        to: dto.targetStatus,
        acknowledgeR2Coverage: dto.acknowledgeR2Coverage,
      },
    })

    return toEventResponse(updated)
  }

  async updateTiebreaker(
    id: string,
    dto: UpdateTiebreakerDto,
    managerId: string,
  ): Promise<EventResponseDto> {
    const event = await this.repository.findById(id, managerId)
    if (!event) throw new NotFoundException('Evento não encontrado')

    if (event.status === EventStatus.FINISHED) {
      throw new BadRequestException('Evento finalizado não pode ser alterado')
    }

    if (dto.secondCategoryId && !dto.firstCategoryId) {
      throw new BadRequestException(
        'Não é possível definir secondCategoryId sem firstCategoryId',
      )
    }

    if (dto.firstCategoryId && dto.secondCategoryId && dto.firstCategoryId === dto.secondCategoryId) {
      throw new BadRequestException('firstCategoryId e secondCategoryId devem ser diferentes')
    }

    if (dto.firstCategoryId) {
      const belongs = await this.repository.categoryBelongsToEvent(dto.firstCategoryId, id)
      if (!belongs) {
        throw new BadRequestException('firstCategoryId não pertence a este evento')
      }
    }

    if (dto.secondCategoryId) {
      const belongs = await this.repository.categoryBelongsToEvent(dto.secondCategoryId, id)
      if (!belongs) {
        throw new BadRequestException('secondCategoryId não pertence a este evento')
      }
    }

    await this.repository.upsertTiebreaker(id, {
      firstCategoryId: dto.firstCategoryId ?? null,
      secondCategoryId: dto.secondCategoryId ?? null,
    })

    await this.auditService.record({
      action: 'EVENT_TIEBREAKER_UPDATED',
      entityType: 'JudgingEvent',
      entityId: id,
      actorId: managerId,
      payload: dto,
    })

    const refreshed = await this.repository.findById(id, managerId)
    return toEventResponse(refreshed!)
  }

  async removeTiebreaker(id: string, managerId: string): Promise<void> {
    const event = await this.repository.findById(id, managerId)
    if (!event) throw new NotFoundException('Evento não encontrado')

    if (event.status === EventStatus.FINISHED) {
      throw new BadRequestException('Evento finalizado não pode ser alterado')
    }

    await this.repository.deleteTiebreaker(id)

    await this.auditService.record({
      action: 'EVENT_TIEBREAKER_REMOVED',
      entityType: 'JudgingEvent',
      entityId: id,
      actorId: managerId,
      payload: {},
    })
  }

  async updateCertificateText(
    id: string,
    text: string,
    managerId: string,
  ): Promise<EventResponseDto> {
    const event = await this.repository.findById(id, managerId)
    if (!event) throw new NotFoundException('Evento não encontrado')

    if (event.status === EventStatus.FINISHED) {
      throw new BadRequestException('Evento finalizado não pode ser alterado')
    }

    const placeholderRegex = /\{\{(\w+)\}\}/g
    const found = [...text.matchAll(placeholderRegex)].map(m => `{{${m[1]}}}`)
    const unknown = found.filter(p => !KNOWN_PLACEHOLDERS.includes(p))
    if (unknown.length > 0) {
      // warn apenas — placeholder desconhecido será literal no PDF
    }

    const updated = await this.repository.update(id, { certificateText: text })

    await this.auditService.record({
      action: 'EVENT_CERTIFICATE_TEXT_UPDATED',
      entityType: 'JudgingEvent',
      entityId: id,
      actorId: managerId,
      payload: { textLength: text.length, unknownPlaceholders: unknown },
    })

    return toEventResponse(updated)
  }

}
