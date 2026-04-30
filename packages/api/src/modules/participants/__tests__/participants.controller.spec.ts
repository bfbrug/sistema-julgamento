import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { ParticipantState } from '@prisma/client'
import { ParticipantsController } from '../participants.controller'
import { ParticipantsService } from '../participants.service'

const mockParticipant = {
  id: 'part-1',
  eventId: 'event-1',
  name: 'João Silva',
  photoUrl: null,
  presentationOrder: 1,
  isAbsent: false,
  currentState: ParticipantState.WAITING,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  counts: { scoresRecorded: 0, scoresFinalized: 0 },
}

describe('ParticipantsController', () => {
  let controller: ParticipantsController
  let service: any

  beforeEach(async () => {
    service = {
      create: vi.fn().mockResolvedValue(mockParticipant),
      list: vi.fn().mockResolvedValue([mockParticipant]),
      findById: vi.fn().mockResolvedValue(mockParticipant),
      update: vi.fn().mockResolvedValue({ ...mockParticipant, name: 'Novo Nome' }),
      remove: vi.fn().mockResolvedValue(undefined),
      reorder: vi.fn().mockResolvedValue([mockParticipant]),
      uploadPhoto: vi.fn().mockResolvedValue({ ...mockParticipant, photoUrl: '/uploads/foto.jpg' }),
      removePhoto: vi.fn().mockResolvedValue({ ...mockParticipant, photoUrl: null }),
      markAbsent: vi.fn().mockResolvedValue({ ...mockParticipant, isAbsent: true, currentState: ParticipantState.ABSENT }),
      unmarkAbsent: vi.fn().mockResolvedValue({ ...mockParticipant, isAbsent: false }),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParticipantsController],
      providers: [{ provide: ParticipantsService, useValue: service }],
    }).compile()

    controller = module.get<ParticipantsController>(ParticipantsController)
  })

  it('create: chama service.create com eventId, dto e managerId', async () => {
    const res = await controller.create('event-1', { name: 'João Silva' }, { sub: 'manager-1' } as never)
    expect(res.id).toBe('part-1')
    expect(service.create).toHaveBeenCalledWith('event-1', { name: 'João Silva' }, 'manager-1')
  })

  it('list: retorna array de participantes', async () => {
    const res = await controller.list('event-1', { sub: 'manager-1' } as never)
    expect(res).toHaveLength(1)
    expect(service.list).toHaveBeenCalledWith('event-1', 'manager-1')
  })

  it('findOne: chama service.findById com id, eventId e managerId', async () => {
    const res = await controller.findOne('event-1', 'part-1', { sub: 'manager-1' } as never)
    expect(res.id).toBe('part-1')
    expect(service.findById).toHaveBeenCalledWith('part-1', 'event-1', 'manager-1')
  })

  it('update: chama service.update e retorna participante atualizado', async () => {
    const res = await controller.update('event-1', 'part-1', { name: 'Novo Nome' }, { sub: 'manager-1' } as never)
    expect(res.name).toBe('Novo Nome')
    expect(service.update).toHaveBeenCalledWith('part-1', 'event-1', { name: 'Novo Nome' }, 'manager-1')
  })

  it('remove: chama service.remove sem retorno', async () => {
    const res = await controller.remove('event-1', 'part-1', { sub: 'manager-1' } as never)
    expect(res).toBeUndefined()
    expect(service.remove).toHaveBeenCalledWith('part-1', 'event-1', 'manager-1')
  })

  it('reorder: chama service.reorder e retorna lista reordenada', async () => {
    const dto = { items: [{ id: 'part-1', presentationOrder: 1 }] }
    const res = await controller.reorder('event-1', dto, { sub: 'manager-1' } as never)
    expect(res).toHaveLength(1)
    expect(service.reorder).toHaveBeenCalledWith('event-1', dto, 'manager-1')
  })

  it('removePhoto: chama service.removePhoto e retorna participante sem foto', async () => {
    const res = await controller.removePhoto('event-1', 'part-1', { sub: 'manager-1' } as never)
    expect(res.photoUrl).toBeNull()
    expect(service.removePhoto).toHaveBeenCalledWith('part-1', 'event-1', 'manager-1')
  })

  it('markAbsent: chama service.markAbsent com dto e retorna participante ausente', async () => {
    const dto = { reason: 'Não compareceu' }
    const res = await controller.markAbsent('event-1', 'part-1', dto, { sub: 'manager-1' } as never)
    expect(res.isAbsent).toBe(true)
    expect(res.currentState).toBe(ParticipantState.ABSENT)
    expect(service.markAbsent).toHaveBeenCalledWith('part-1', 'event-1', dto, 'manager-1')
  })

  it('unmarkAbsent: chama service.unmarkAbsent e retorna participante não ausente', async () => {
    const res = await controller.unmarkAbsent('event-1', 'part-1', { sub: 'manager-1' } as never)
    expect(res.isAbsent).toBe(false)
    expect(service.unmarkAbsent).toHaveBeenCalledWith('part-1', 'event-1', 'manager-1')
  })
})
