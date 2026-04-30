import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { EventStatus, ParticipantState } from '@prisma/client'
import { ParticipantsService } from '../participants.service'
import { ParticipantsRepository } from '../participants.repository'
import { EventsRepository } from '../../events/events.repository'
import { AuditService } from '../../audit/audit.service'
import { STORAGE_SERVICE } from '../../storage/storage.service.interface'
import { PrismaService } from '../../../config/prisma.service'

// Magic bytes para simular arquivos
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Buffer.alloc(500)])
const GIF_MAGIC = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, ...Buffer.alloc(500)])

const makeEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 'event-1',
  managerId: 'manager-1',
  status: EventStatus.DRAFT,
  ...overrides,
})

const makeParticipant = (overrides: Record<string, unknown> = {}) => ({
  id: 'part-1',
  eventId: 'event-1',
  name: 'João Silva',
  photoPath: null,
  presentationOrder: 1,
  isAbsent: false,
  currentState: ParticipantState.WAITING,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  _count: { scores: 0 },
  scoresFinalized: 0,
  ...overrides,
})

describe('ParticipantsService', () => {
  let service: ParticipantsService
  let repository: any
  let eventsRepository: any
  let auditService: any
  let storageService: any

  beforeEach(async () => {
    repository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByEventId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      countScores: vi.fn().mockResolvedValue(0),
      maxPresentationOrder: vi.fn().mockResolvedValue(0),
      shiftPresentationOrderUp: vi.fn(),
      compactPresentationOrder: vi.fn(),
      reorderInTransaction: vi.fn(),
      createStateLog: vi.fn(),
    }

    eventsRepository = {
      findById: vi.fn(),
    }

    auditService = { record: vi.fn() }

    storageService = {
      upload: vi.fn(),
      remove: vi.fn(),
      getPublicUrl: vi.fn().mockResolvedValue('/uploads/test.jpg'),
      exists: vi.fn().mockResolvedValue(true),
    }

    const prisma = { $transaction: vi.fn(async (cb: any) => cb({ auditLog: { create: vi.fn() } })) }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticipantsService,
        { provide: ParticipantsRepository, useValue: repository },
        { provide: EventsRepository, useValue: eventsRepository },
        { provide: AuditService, useValue: auditService },
        { provide: STORAGE_SERVICE, useValue: storageService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get<ParticipantsService>(ParticipantsService)
  })

  describe('create', () => {
    it('cria participante em evento DRAFT sem presentationOrder → atribui MAX+1', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.maxPresentationOrder.mockResolvedValue(2)
      const created = makeParticipant({ id: 'part-new', presentationOrder: 3 })
      repository.create.mockResolvedValue(created)
      repository.findById.mockResolvedValue(created)

      const res = await service.create('event-1', { name: 'João' }, 'manager-1')

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ presentationOrder: 3 }),
        expect.anything(),
      )
      expect(res.presentationOrder).toBe(3)
    })

    it('cria com presentationOrder fornecido → chama shiftPresentationOrderUp', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      const created = makeParticipant({ presentationOrder: 1 })
      repository.create.mockResolvedValue(created)
      repository.findById.mockResolvedValue(created)

      await service.create('event-1', { name: 'João', presentationOrder: 1 }, 'manager-1')

      expect(repository.shiftPresentationOrderUp).toHaveBeenCalledWith('event-1', 1)
    })

    it('lança AppException EVENT_IN_PROGRESS_LOCK em evento IN_PROGRESS', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))

      await expect(
        service.create('event-1', { name: 'João' }, 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'EVENT_IN_PROGRESS_LOCK')
    })

    it('lança AppException EVENT_FINISHED em evento FINISHED', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.FINISHED }))

      await expect(
        service.create('event-1', { name: 'João' }, 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'EVENT_FINISHED')
    })

    it('lança NotFoundException para evento de outro gestor', async () => {
      eventsRepository.findById.mockResolvedValue(null)

      await expect(
        service.create('event-1', { name: 'João' }, 'outro-manager'),
      ).rejects.toThrow(NotFoundException)
    })

    it('registra auditoria PARTICIPANT_CREATED', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.maxPresentationOrder.mockResolvedValue(0)
      const created = makeParticipant()
      repository.create.mockResolvedValue(created)
      repository.findById.mockResolvedValue(created)

      await service.create('event-1', { name: 'João' }, 'manager-1')

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PARTICIPANT_CREATED' }),
        expect.anything(),
      )
    })
  })

  describe('update', () => {
    it('atualiza nome em evento DRAFT', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      const original = makeParticipant()
      repository.findById.mockResolvedValueOnce(original)
      const updated = makeParticipant({ name: 'Maria' })
      repository.update.mockResolvedValue(updated)
      repository.findById.mockResolvedValueOnce(updated)

      const res = await service.update('part-1', 'event-1', { name: 'Maria' }, 'manager-1')

      expect(res.name).toBe('Maria')
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PARTICIPANT_UPDATED' }),
        expect.anything(),
      )
    })

    it('lança AppException EVENT_IN_PROGRESS_LOCK ao atualizar em evento IN_PROGRESS', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))

      await expect(
        service.update('part-1', 'event-1', { name: 'X' }, 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'EVENT_IN_PROGRESS_LOCK')
    })
  })

  describe('remove', () => {
    it('remove participante sem scores, recompacta ordem e registra audit', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findById.mockResolvedValue(makeParticipant())
      repository.countScores.mockResolvedValue(0)

      await service.remove('part-1', 'event-1', 'manager-1')

      expect(repository.delete).toHaveBeenCalledWith('part-1', expect.anything())
      expect(repository.compactPresentationOrder).toHaveBeenCalledWith('event-1', expect.anything())
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PARTICIPANT_DELETED' }),
        expect.anything(),
      )
    })

    it('lança AppException PARTICIPANT_HAS_SCORES quando há scores', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findById.mockResolvedValue(makeParticipant())
      repository.countScores.mockResolvedValue(2)

      await expect(
        service.remove('part-1', 'event-1', 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'PARTICIPANT_HAS_SCORES')
    })

    it('deleta foto do storage quando participante tem foto', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findById.mockResolvedValue(
        makeParticipant({ photoPath: 'participant-photo/event-1/foto.jpg' }),
      )
      repository.countScores.mockResolvedValue(0)

      await service.remove('part-1', 'event-1', 'manager-1')

      expect(storageService.remove).toHaveBeenCalledWith('participant-photo/event-1/foto.jpg')
    })

    it('não chama storageService.remove quando não há foto', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findById.mockResolvedValue(makeParticipant({ photoPath: null }))
      repository.countScores.mockResolvedValue(0)

      await service.remove('part-1', 'event-1', 'manager-1')

      expect(storageService.remove).not.toHaveBeenCalled()
    })

    it('lança AppException EVENT_IN_PROGRESS_LOCK em evento IN_PROGRESS', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))

      await expect(
        service.remove('part-1', 'event-1', 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'EVENT_IN_PROGRESS_LOCK')
    })
  })

  describe('reorder', () => {
    it('reordena atomicamente e registra auditoria', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      const parts = [
        makeParticipant({ id: 'part-1', presentationOrder: 1 }),
        makeParticipant({ id: 'part-2', name: 'Maria', presentationOrder: 2 }),
      ]
      repository.findByEventId
        .mockResolvedValueOnce(parts)  // validação IDs
        .mockResolvedValueOnce(parts)  // list() final

      const dto = {
        items: [
          { id: 'part-2', presentationOrder: 1 },
          { id: 'part-1', presentationOrder: 2 },
        ],
      }
      await service.reorder('event-1', dto, 'manager-1')

      expect(repository.reorderInTransaction).toHaveBeenCalledWith(dto.items, expect.anything())
      expect(repository.compactPresentationOrder).toHaveBeenCalledWith('event-1', expect.anything())
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PARTICIPANTS_REORDERED' }),
        expect.anything(),
      )
    })

    it('lança AppException PARTICIPANT_NOT_IN_EVENT para ID de outro evento', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findByEventId.mockResolvedValue([makeParticipant({ id: 'part-1' })])

      const dto = { items: [{ id: 'id-desconhecido', presentationOrder: 1 }] }

      await expect(
        service.reorder('event-1', dto, 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'PARTICIPANT_NOT_IN_EVENT')
    })

    it('lança AppException PARTICIPANT_DUPLICATE_ORDER com ordens duplicadas', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findByEventId.mockResolvedValue([
        makeParticipant({ id: 'part-1' }),
        makeParticipant({ id: 'part-2' }),
      ])

      const dto = {
        items: [
          { id: 'part-1', presentationOrder: 1 },
          { id: 'part-2', presentationOrder: 1 }, // duplicado
        ],
      }

      await expect(
        service.reorder('event-1', dto, 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'PARTICIPANT_DUPLICATE_ORDER')
    })
  })

  describe('uploadPhoto', () => {
    it('lança INVALID_FILE_TYPE para MIME inválido (magic bytes de GIF)', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findById.mockResolvedValue(makeParticipant())

      await expect(
        service.uploadPhoto(
          'part-1',
          'event-1',
          { buffer: GIF_MAGIC, originalName: 'foto.gif', mimeType: 'image/gif' },
          'manager-1',
        ),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'INVALID_FILE_TYPE')
    })

    it('lança FILE_TOO_LARGE para arquivo grande demais', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findById.mockResolvedValue(makeParticipant())

      const big = Buffer.concat([JPEG_MAGIC, Buffer.alloc(3 * 1024 * 1024)])

      await expect(
        service.uploadPhoto(
          'part-1',
          'event-1',
          { buffer: big, originalName: 'foto.jpg', mimeType: 'image/jpeg' },
          'manager-1',
        ),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'FILE_TOO_LARGE')
    })

    it('substitui foto anterior (deleta antiga e sobe nova)', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      // 1ª chamada: findById para validar existência
      repository.findById.mockResolvedValueOnce(
        makeParticipant({ photoPath: 'participant-photo/event-1/old.jpg' }),
      )
      storageService.upload.mockResolvedValue({
        path: 'participant-photo/event-1/new.jpg',
        publicUrl: '/uploads/participant-photo/event-1/new.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 512,
      })
      repository.update.mockResolvedValue({})
      // 2ª chamada: findById no final para retornar o participante atualizado
      repository.findById.mockResolvedValueOnce(
        makeParticipant({ photoPath: 'participant-photo/event-1/new.jpg' }),
      )

      await service.uploadPhoto(
        'part-1',
        'event-1',
        { buffer: JPEG_MAGIC, originalName: 'foto.jpg', mimeType: 'image/jpeg' },
        'manager-1',
      )

      expect(storageService.remove).toHaveBeenCalledWith('participant-photo/event-1/old.jpg')
      expect(storageService.upload).toHaveBeenCalled()
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PARTICIPANT_PHOTO_UPLOADED' }),
        expect.anything(),
      )
    })

    it('lança EVENT_IN_PROGRESS_LOCK ao fazer upload em evento IN_PROGRESS', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))

      await expect(
        service.uploadPhoto(
          'part-1',
          'event-1',
          { buffer: JPEG_MAGIC, originalName: 'foto.jpg', mimeType: 'image/jpeg' },
          'manager-1',
        ),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'EVENT_IN_PROGRESS_LOCK')
    })
  })

  describe('markAbsent', () => {
    it('marca ausente em evento IN_PROGRESS (caso permitido)', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))
      const participant = makeParticipant()
      repository.findById.mockResolvedValue(participant)
      repository.update.mockResolvedValue({})
      repository.findById.mockResolvedValue(
        makeParticipant({ isAbsent: true, currentState: ParticipantState.ABSENT }),
      )

      await service.markAbsent('part-1', 'event-1', { reason: 'Não compareceu' }, 'manager-1')

      expect(repository.update).toHaveBeenCalledWith('part-1', {
        isAbsent: true,
        currentState: ParticipantState.ABSENT,
      }, expect.anything())
      expect(repository.createStateLog).toHaveBeenCalledWith(
        'part-1',
        ParticipantState.ABSENT,
        'manager-1',
        expect.anything(),
      )
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PARTICIPANT_MARKED_ABSENT' }),
        expect.anything(),
      )
    })

    it('marca ausente em evento DRAFT', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.DRAFT }))
      repository.findById.mockResolvedValue(makeParticipant())
      repository.update.mockResolvedValue({})
      repository.findById.mockResolvedValue(
        makeParticipant({ isAbsent: true, currentState: ParticipantState.ABSENT }),
      )

      await expect(
        service.markAbsent('part-1', 'event-1', {}, 'manager-1'),
      ).resolves.not.toThrow()
    })

    it('lança EVENT_FINISHED ao tentar marcar ausente em evento FINISHED', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.FINISHED }))

      await expect(
        service.markAbsent('part-1', 'event-1', {}, 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'EVENT_FINISHED')
    })

    it('preserva scores finalizados (não altera score, apenas muda estado do participante)', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))
      const participantWithScores = makeParticipant({
        _count: { scores: 3 },
        scoresFinalized: 2,
      })
      repository.findById.mockResolvedValue(participantWithScores)
      repository.update.mockResolvedValue({})
      repository.findById.mockResolvedValue(
        makeParticipant({ isAbsent: true, currentState: ParticipantState.ABSENT, scoresFinalized: 2 }),
      )

      const result = await service.markAbsent('part-1', 'event-1', {}, 'manager-1')

      // Scores não são deletados — apenas estado muda
      expect(repository.delete).not.toHaveBeenCalled()
      // Retorna participante com counts preservados
      expect(result.counts.scoresFinalized).toBe(2)
    })
  })

  describe('unmarkAbsent', () => {
    it('desmarca ausência em evento DRAFT', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.DRAFT }))
      repository.findById.mockResolvedValue(
        makeParticipant({ isAbsent: true, currentState: ParticipantState.ABSENT }),
      )
      repository.update.mockResolvedValue({})
      repository.findById.mockResolvedValue(makeParticipant())

      await service.unmarkAbsent('part-1', 'event-1', 'manager-1')

      expect(repository.update).toHaveBeenCalledWith('part-1', {
        isAbsent: false,
        currentState: ParticipantState.WAITING,
      }, expect.anything())
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PARTICIPANT_UNMARKED_ABSENT' }),
        expect.anything(),
      )
    })

    it('lança EVENT_IN_PROGRESS_LOCK ao tentar desmarcar em evento IN_PROGRESS', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))

      await expect(
        service.unmarkAbsent('part-1', 'event-1', 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'EVENT_IN_PROGRESS_LOCK')
    })

    it('lança EVENT_FINISHED ao tentar desmarcar em evento FINISHED', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.FINISHED }))

      await expect(
        service.unmarkAbsent('part-1', 'event-1', 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'EVENT_FINISHED')
    })
  })

  describe('findById', () => {
    it('lança NotFoundException para participante de outro evento', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findById.mockResolvedValue(makeParticipant({ eventId: 'outro-evento' }))

      await expect(
        service.findById('part-1', 'event-1', 'manager-1'),
      ).rejects.toThrow(NotFoundException)
    })

    it('retorna participante com photoUrl quando há foto', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findById.mockResolvedValue(
        makeParticipant({ photoPath: 'participant-photo/event-1/foto.jpg' }),
      )
      storageService.getPublicUrl.mockResolvedValue('/uploads/participant-photo/event-1/foto.jpg')

      const result = await service.findById('part-1', 'event-1', 'manager-1')

      expect(result.photoUrl).toBe('/uploads/participant-photo/event-1/foto.jpg')
    })
  })
})
