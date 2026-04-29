import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { EventStatus, Prisma } from '@prisma/client'
import { JudgesRepository, JudgeWithRelations } from './judges.repository'
import { EventsRepository } from '../events/events.repository'
import { UsersRepository } from '../users/users.repository'
import { AuditService } from '../audit/audit.service'
import { AppException } from '../../common/exceptions/app.exception'
import { AddJudgeDto } from './dto/add-judge.dto'
import { UpdateJudgeDto } from './dto/update-judge.dto'
import { JudgeResponseDto } from './dto/judge-response.dto'
import { plainToInstance } from 'class-transformer'

function toJudgeResponse(judge: JudgeWithRelations): JudgeResponseDto {
  return plainToInstance(
    JudgeResponseDto,
    {
      ...judge,
      categories: judge.judgeCategories.map((jc) => jc.category),
    },
    { excludeExtraneousValues: true },
  )
}

@Injectable()
export class JudgesService {
  constructor(
    @Inject(JudgesRepository) private readonly repository: JudgesRepository,
    @Inject(EventsRepository) private readonly eventsRepository: EventsRepository,
    @Inject(UsersRepository) private readonly usersRepository: UsersRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  private async getEventOrThrow(eventId: string, managerId: string) {
    const event = await this.eventsRepository.findById(eventId, managerId)
    if (!event) throw new NotFoundException('Evento não encontrado')
    return event
  }

  private assertEventEditable(status: EventStatus): void {
    if (status === EventStatus.FINISHED) {
      throw new AppException('Evento finalizado não pode ser alterado', 400, 'EVENT_FINISHED')
    }
    if (status === EventStatus.IN_PROGRESS) {
      throw new AppException(
        'Evento em andamento não permite alterações nos jurados',
        400,
        'EVENT_IN_PROGRESS_LOCK',
      )
    }
  }

  async add(eventId: string, dto: AddJudgeDto, managerId: string): Promise<JudgeResponseDto> {
    const event = await this.getEventOrThrow(eventId, managerId)
    this.assertEventEditable(event.status)

    // RN-09.6 — Apenas usuários com role JURADO
    const user = await this.usersRepository.findById(dto.userId)
    if (!user) {
      throw new NotFoundException('Usuário não encontrado')
    }
    if (user.role !== 'JURADO') {
      throw new AppException(
        'Apenas usuários com papel JURADO podem ser adicionados como jurados',
        400,
        'INVALID_USER_ROLE',
      )
    }

    // RN-09.7 — Mesmo usuário não pode ser jurado 2x no mesmo evento
    const existing = await this.repository.findByUserAndEvent(dto.userId, eventId)
    if (existing) {
      throw new ConflictException({
        message: 'Este usuário já é jurado neste evento',
        code: 'JUDGE_ALREADY_IN_EVENT',
      })
    }

    const displayName = dto.displayName ?? user.name

    let judge: JudgeWithRelations
    if (dto.categoryIds && dto.categoryIds.length > 0) {
      judge = await this.repository.createWithCategories(
        {
          user: { connect: { id: dto.userId } },
          displayName,
          event: { connect: { id: eventId } },
        },
        dto.categoryIds,
      )
    } else {
      const created = await this.repository.create({
        user: { connect: { id: dto.userId } },
        displayName,
        event: { connect: { id: eventId } },
      })
      const withRelations = await this.repository.findById(created.id)
      judge = withRelations!
    }

    await this.auditService.record({
      action: 'JUDGE_ADDED',
      entityType: 'Judge',
      entityId: judge.id,
      actorId: managerId,
      payload: { eventId, userId: dto.userId, displayName, categoryIds: dto.categoryIds ?? [] },
    })

    return toJudgeResponse(judge)
  }

  async list(eventId: string, managerId: string): Promise<JudgeResponseDto[]> {
    await this.getEventOrThrow(eventId, managerId)
    const judges = await this.repository.findByEventId(eventId)
    return judges.map(toJudgeResponse)
  }

  async findById(id: string, eventId: string, managerId: string): Promise<JudgeResponseDto> {
    await this.getEventOrThrow(eventId, managerId)
    const judge = await this.repository.findById(id)
    if (!judge || judge.eventId !== eventId) {
      throw new NotFoundException('Jurado não encontrado')
    }
    return toJudgeResponse(judge)
  }

  async update(
    id: string,
    eventId: string,
    dto: UpdateJudgeDto,
    managerId: string,
  ): Promise<JudgeResponseDto> {
    // RN-09.9: update de displayName é permitido em qualquer status
    await this.getEventOrThrow(eventId, managerId)
    const judge = await this.repository.findById(id)
    if (!judge || judge.eventId !== eventId) {
      throw new NotFoundException('Jurado não encontrado')
    }

    const updateData: Prisma.JudgeUpdateInput = {}
    if (dto.displayName !== undefined) {
      updateData.displayName = dto.displayName
    }

    await this.repository.update(id, updateData)

    await this.auditService.record({
      action: 'JUDGE_UPDATED',
      entityType: 'Judge',
      entityId: id,
      actorId: managerId,
      payload: { before: { displayName: judge.displayName }, after: dto },
    })

    const updated = await this.repository.findById(id)
    return toJudgeResponse(updated!)
  }

  async remove(id: string, eventId: string, managerId: string): Promise<void> {
    const event = await this.getEventOrThrow(eventId, managerId)
    this.assertEventEditable(event.status)

    const judge = await this.repository.findById(id)
    if (!judge || judge.eventId !== eventId) {
      throw new NotFoundException('Jurado não encontrado')
    }

    // Bloquear se já registrou scores
    const scoreCount = await this.repository.countScores(id)
    if (scoreCount > 0) {
      throw new AppException(
        'O jurado já registrou notas e não pode ser removido',
        422,
        'JUDGE_HAS_SCORES',
      )
    }

    await this.repository.delete(id)

    await this.auditService.record({
      action: 'JUDGE_REMOVED',
      entityType: 'Judge',
      entityId: id,
      actorId: managerId,
      payload: { eventId, displayName: judge.displayName },
    })
  }
}
