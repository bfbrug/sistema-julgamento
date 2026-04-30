import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ParticipantsRepository } from '../participants.repository'
import { PrismaService } from '../../../config/prisma.service'
import { ParticipantState } from '@prisma/client'

function makePrisma() {
  return {
    participant: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
      updateMany: vi.fn(),
    },
    score: {
      count: vi.fn(),
    },
    participantStateLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation((p) => Promise.all(p)),
  } as unknown as PrismaService
}

describe('ParticipantsRepository', () => {
  let prisma: ReturnType<typeof makePrisma>
  let repo: ParticipantsRepository

  beforeEach(() => {
    prisma = makePrisma()
    repo = new ParticipantsRepository(prisma)
  })

  it('create: chama prisma.participant.create', async () => {
    const data = { name: 'Test', eventId: 'e-1', presentationOrder: 1 } as any
    await repo.create(data)
    expect(prisma.participant.create).toHaveBeenCalledWith({ data })
  })

  it('findById: retorna participante com counts', async () => {
    const mockP = { id: 'p-1', name: 'Test', eventId: 'e-1' }
    ;(prisma.participant.findUnique as any).mockResolvedValue({
      ...mockP,
      _count: { scores: 5 },
    })
    ;(prisma.score.count as any).mockResolvedValue(3)

    const result = await repo.findById('p-1')
    expect(result).toEqual({ ...mockP, _count: { scores: 5 }, scoresFinalized: 3 })
  })

  it('findByEventId: retorna lista com counts', async () => {
    const mockP = { id: 'p-1', name: 'Test', eventId: 'e-1' }
    ;(prisma.participant.findMany as any).mockResolvedValue([
      { ...mockP, _count: { scores: 5 } },
    ])
    ;(prisma.score.count as any).mockResolvedValue(3)

    const result = await repo.findByEventId('e-1')
    expect(result[0]).toEqual({ ...mockP, _count: { scores: 5 }, scoresFinalized: 3 })
  })

  it('update: chama prisma.participant.update', async () => {
    const data = { name: 'Novo' }
    await repo.update('p-1', data)
    expect(prisma.participant.update).toHaveBeenCalledWith({ where: { id: 'p-1' }, data })
  })

  it('delete: chama prisma.participant.delete', async () => {
    await repo.delete('p-1')
    expect(prisma.participant.delete).toHaveBeenCalledWith({ where: { id: 'p-1' } })
  })

  it('countScores: chama prisma.score.count', async () => {
    await repo.countScores('p-1')
    expect(prisma.score.count).toHaveBeenCalledWith({ where: { participantId: 'p-1' } })
  })

  it('maxPresentationOrder: retorna valor máximo', async () => {
    ;(prisma.participant.aggregate as any).mockResolvedValue({ _max: { presentationOrder: 10 } })
    const res = await repo.maxPresentationOrder('e-1')
    expect(res).toBe(10)
  })

  it('shiftPresentationOrderUp: chama updateMany com increment', async () => {
    await repo.shiftPresentationOrderUp('e-1', 5)
    expect(prisma.participant.updateMany).toHaveBeenCalledWith({
      where: { eventId: 'e-1', presentationOrder: { gte: 5 } },
      data: { presentationOrder: { increment: 1 } },
    })
  })

  it('createStateLog: chama prisma.participantStateLog.create', async () => {
    const data = { participantId: 'p-1', state: ParticipantState.ABSENT, changedByUserId: 'u-1' }
    await repo.createStateLog('p-1', ParticipantState.ABSENT, 'u-1')
    expect(prisma.participantStateLog.create).toHaveBeenCalledWith({ data })
  })
})
