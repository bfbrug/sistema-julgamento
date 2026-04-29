import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common'
import { EventStatus, ParticipantState } from '@prisma/client'
import * as FileType from 'file-type'
import { ParticipantsRepository, ParticipantWithCounts } from './participants.repository'
import { EventsRepository } from '../events/events.repository'
import { AuditService } from '../audit/audit.service'
import { AppException } from '../../common/exceptions/app.exception'
import { CreateParticipantDto } from './dto/create-participant.dto'
import { UpdateParticipantDto } from './dto/update-participant.dto'
import { ReorderParticipantsDto } from './dto/reorder-participants.dto'
import { MarkAbsentDto } from './dto/mark-absent.dto'
import { ParticipantResponseDto } from './dto/participant-response.dto'
import { IStorageService, STORAGE_SERVICE } from '../storage/storage.service.interface'
import { plainToInstance } from 'class-transformer'
import { env } from '../../config/env'

async function toParticipantResponse(
  p: ParticipantWithCounts,
  storageService: IStorageService,
): Promise<ParticipantResponseDto> {
  const photoUrl = p.photoPath ? await storageService.getPublicUrl(p.photoPath) : null
  return plainToInstance(
    ParticipantResponseDto,
    {
      ...p,
      photoUrl,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      counts: {
        scoresRecorded: p._count.scores,
        scoresFinalized: p.scoresFinalized,
      },
    },
    { excludeExtraneousValues: true },
  )
}

@Injectable()
export class ParticipantsService {
  constructor(
    @Inject(ParticipantsRepository) private readonly repository: ParticipantsRepository,
    @Inject(EventsRepository) private readonly eventsRepository: EventsRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
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
        'Evento em andamento não permite alterações nos participantes',
        400,
        'EVENT_IN_PROGRESS_LOCK',
      )
    }
  }

  async create(
    eventId: string,
    dto: CreateParticipantDto,
    managerId: string,
  ): Promise<ParticipantResponseDto> {
    const event = await this.getEventOrThrow(eventId, managerId)
    this.assertEventMutable(event.status)

    let presentationOrder = dto.presentationOrder
    if (presentationOrder === undefined) {
      presentationOrder = (await this.repository.maxPresentationOrder(eventId)) + 1
    } else {
      await this.repository.shiftPresentationOrderUp(eventId, presentationOrder)
    }

    const created = await this.repository.create({
      name: dto.name,
      presentationOrder,
      event: { connect: { id: eventId } },
    })

    await this.auditService.record({
      action: 'PARTICIPANT_CREATED',
      entityType: 'Participant',
      entityId: created.id,
      actorId: managerId,
      payload: { eventId, name: dto.name, presentationOrder },
    })

    const withCounts = await this.repository.findById(created.id)
    return toParticipantResponse(withCounts!, this.storageService)
  }

  async list(eventId: string, managerId: string): Promise<ParticipantResponseDto[]> {
    await this.getEventOrThrow(eventId, managerId)
    const participants = await this.repository.findByEventId(eventId)
    return Promise.all(participants.map((p) => toParticipantResponse(p, this.storageService)))
  }

  async findById(
    id: string,
    eventId: string,
    managerId: string,
  ): Promise<ParticipantResponseDto> {
    await this.getEventOrThrow(eventId, managerId)
    const participant = await this.repository.findById(id)
    if (!participant || participant.eventId !== eventId) {
      throw new NotFoundException('Participante não encontrado')
    }
    return toParticipantResponse(participant, this.storageService)
  }

  async update(
    id: string,
    eventId: string,
    dto: UpdateParticipantDto,
    managerId: string,
  ): Promise<ParticipantResponseDto> {
    const event = await this.getEventOrThrow(eventId, managerId)
    this.assertEventMutable(event.status)

    const participant = await this.repository.findById(id)
    if (!participant || participant.eventId !== eventId) {
      throw new NotFoundException('Participante não encontrado')
    }

    await this.repository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
    })

    await this.auditService.record({
      action: 'PARTICIPANT_UPDATED',
      entityType: 'Participant',
      entityId: id,
      actorId: managerId,
      payload: { before: { name: participant.name }, after: dto },
    })

    const updated = await this.repository.findById(id)
    return toParticipantResponse(updated!, this.storageService)
  }

  async remove(id: string, eventId: string, managerId: string): Promise<void> {
    const event = await this.getEventOrThrow(eventId, managerId)
    this.assertEventMutable(event.status)

    const participant = await this.repository.findById(id)
    if (!participant || participant.eventId !== eventId) {
      throw new NotFoundException('Participante não encontrado')
    }

    const scoreCount = await this.repository.countScores(id)
    if (scoreCount > 0) {
      throw new AppException(
        'Participante possui notas registradas e não pode ser removido',
        422,
        'PARTICIPANT_HAS_SCORES',
      )
    }

    // RN-10.6: deletar foto do storage ao remover participante
    if (participant.photoPath) {
      await this.storageService.remove(participant.photoPath)
    }

    await this.repository.delete(id)
    await this.repository.compactPresentationOrder(eventId)

    await this.auditService.record({
      action: 'PARTICIPANT_DELETED',
      entityType: 'Participant',
      entityId: id,
      actorId: managerId,
      payload: { eventId, name: participant.name },
    })
  }

  async reorder(
    eventId: string,
    dto: ReorderParticipantsDto,
    managerId: string,
  ): Promise<ParticipantResponseDto[]> {
    const event = await this.getEventOrThrow(eventId, managerId)
    this.assertEventMutable(event.status)

    const allParticipants = await this.repository.findByEventId(eventId)
    const eventParticipantIds = new Set(allParticipants.map((p) => p.id))

    for (const item of dto.items) {
      if (!eventParticipantIds.has(item.id)) {
        throw new AppException(
          `Participante ${item.id} não pertence a este evento`,
          400,
          'PARTICIPANT_NOT_IN_EVENT',
        )
      }
    }

    const orders = dto.items.map((i) => i.presentationOrder)
    const uniqueOrders = new Set(orders)
    if (uniqueOrders.size !== orders.length) {
      throw new AppException(
        'presentationOrder deve ser único para cada participante',
        400,
        'PARTICIPANT_DUPLICATE_ORDER',
      )
    }

    await this.repository.reorderInTransaction(dto.items)
    await this.repository.compactPresentationOrder(eventId)

    await this.auditService.record({
      action: 'PARTICIPANTS_REORDERED',
      entityType: 'Participant',
      entityId: eventId,
      actorId: managerId,
      payload: { items: dto.items },
    })

    return this.list(eventId, managerId)
  }

  async uploadPhoto(
    id: string,
    eventId: string,
    file: { buffer: Buffer; originalName: string; mimeType: string },
    managerId: string,
  ): Promise<ParticipantResponseDto> {
    const event = await this.getEventOrThrow(eventId, managerId)
    this.assertEventMutable(event.status)

    const participant = await this.repository.findById(id)
    if (!participant || participant.eventId !== eventId) {
      throw new NotFoundException('Participante não encontrado')
    }

    // RN-10.5: validar MIME por magic bytes
    const allowedMimes = env.PARTICIPANT_PHOTO_ALLOWED_MIMES.split(',').map((m) => m.trim())
    const detectedType = await FileType.fromBuffer(file.buffer)
    const detectedMime = detectedType?.mime ?? null

    if (!detectedMime || !allowedMimes.includes(detectedMime)) {
      throw new AppException(
        `Tipo de arquivo inválido. Permitidos: ${allowedMimes.join(', ')}`,
        422,
        'INVALID_FILE_TYPE',
      )
    }

    if (file.buffer.length > env.PARTICIPANT_PHOTO_MAX_BYTES) {
      throw new AppException(
        `Arquivo excede o tamanho máximo de ${env.PARTICIPANT_PHOTO_MAX_BYTES} bytes`,
        422,
        'FILE_TOO_LARGE',
      )
    }

    // Se já existe foto, deletar a anterior
    if (participant.photoPath) {
      await this.storageService.remove(participant.photoPath)
    }

    const uploaded = await this.storageService.upload({
      buffer: file.buffer,
      originalName: file.originalName,
      mimeType: detectedMime,
      category: 'participant-photo',
      eventId,
    })

    await this.repository.update(id, { photoPath: uploaded.path })

    await this.auditService.record({
      action: 'PARTICIPANT_PHOTO_UPLOADED',
      entityType: 'Participant',
      entityId: id,
      actorId: managerId,
      payload: { eventId, path: uploaded.path, sizeBytes: uploaded.sizeBytes },
    })

    const updated = await this.repository.findById(id)
    return toParticipantResponse(updated!, this.storageService)
  }

  async removePhoto(id: string, eventId: string, managerId: string): Promise<ParticipantResponseDto> {
    const event = await this.getEventOrThrow(eventId, managerId)
    this.assertEventMutable(event.status)

    const participant = await this.repository.findById(id)
    if (!participant || participant.eventId !== eventId) {
      throw new NotFoundException('Participante não encontrado')
    }

    if (participant.photoPath) {
      await this.storageService.remove(participant.photoPath)
      await this.repository.update(id, { photoPath: null })

      await this.auditService.record({
        action: 'PARTICIPANT_PHOTO_REMOVED',
        entityType: 'Participant',
        entityId: id,
        actorId: managerId,
        payload: { eventId, path: participant.photoPath },
      })
    }

    const updated = await this.repository.findById(id)
    return toParticipantResponse(updated!, this.storageService)
  }

  async markAbsent(
    id: string,
    eventId: string,
    dto: MarkAbsentDto,
    managerId: string,
  ): Promise<ParticipantResponseDto> {
    const event = await this.getEventOrThrow(eventId, managerId)

    if (event.status === EventStatus.FINISHED) {
      throw new AppException('Evento finalizado não pode ser alterado', 400, 'EVENT_FINISHED')
    }

    const participant = await this.repository.findById(id)
    if (!participant || participant.eventId !== eventId) {
      throw new NotFoundException('Participante não encontrado')
    }

    await this.repository.update(id, {
      isAbsent: true,
      currentState: ParticipantState.ABSENT,
    })

    await this.repository.createStateLog(id, ParticipantState.ABSENT, managerId)

    await this.auditService.record({
      action: 'PARTICIPANT_MARKED_ABSENT',
      entityType: 'Participant',
      entityId: id,
      actorId: managerId,
      payload: { eventId, reason: dto.reason },
    })

    const updated = await this.repository.findById(id)
    return toParticipantResponse(updated!, this.storageService)
  }

  async unmarkAbsent(
    id: string,
    eventId: string,
    managerId: string,
  ): Promise<ParticipantResponseDto> {
    const event = await this.getEventOrThrow(eventId, managerId)

    if (event.status === EventStatus.FINISHED) {
      throw new AppException('Evento finalizado não pode ser alterado', 400, 'EVENT_FINISHED')
    }

    // Apenas em DRAFT ou REGISTERING (não em IN_PROGRESS)
    if (event.status === EventStatus.IN_PROGRESS) {
      throw new AppException(
        'Não é possível desmarcar ausência durante o evento em andamento',
        400,
        'EVENT_IN_PROGRESS_LOCK',
      )
    }

    const participant = await this.repository.findById(id)
    if (!participant || participant.eventId !== eventId) {
      throw new NotFoundException('Participante não encontrado')
    }

    await this.repository.update(id, {
      isAbsent: false,
      currentState: ParticipantState.WAITING,
    })

    await this.repository.createStateLog(id, ParticipantState.WAITING, managerId)

    await this.auditService.record({
      action: 'PARTICIPANT_UNMARKED_ABSENT',
      entityType: 'Participant',
      entityId: id,
      actorId: managerId,
      payload: { eventId },
    })

    const updated = await this.repository.findById(id)
    return toParticipantResponse(updated!, this.storageService)
  }
}
