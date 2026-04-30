import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConflictException } from '@nestjs/common'
import { ScoringRepository } from '../scoring.repository'
import { PrismaService } from '../../../config/prisma.service'

function makePrisma() {
  return {
    score: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  } as unknown as PrismaService
}

describe('ScoringRepository.upsertScore', () => {
  let prisma: ReturnType<typeof makePrisma>
  let repo: ScoringRepository

  beforeEach(() => {
    prisma = makePrisma()
    repo = new ScoringRepository(prisma)
  })

  it('lança ConflictException se nota já está finalizada', async () => {
    ;(prisma.score.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'score-1',
      isFinalized: true,
    })

    await expect(
      repo.upsertScore({
        judgeId: 'judge-1',
        participantId: 'participant-1',
        categoryId: 'category-1',
        value: 8.5,
      }),
    ).rejects.toThrow(ConflictException)

    expect(prisma.score.upsert).not.toHaveBeenCalled()
  })

  it('permite upsert se nota não existe ainda', async () => {
    ;(prisma.score.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(prisma.score.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'score-new', isFinalized: false })

    const result = await repo.upsertScore({
      judgeId: 'judge-1',
      participantId: 'participant-1',
      categoryId: 'category-1',
      value: 8.5,
    })

    expect(result.isFinalized).toBe(false)
    expect(prisma.score.upsert).toHaveBeenCalledOnce()
  })

  it('permite upsert se nota existe mas não está finalizada', async () => {
    ;(prisma.score.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'score-1',
      isFinalized: false,
    })
    ;(prisma.score.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'score-1', isFinalized: false })

    await repo.upsertScore({
      judgeId: 'judge-1',
      participantId: 'participant-1',
      categoryId: 'category-1',
      value: 9.0,
    })

    expect(prisma.score.upsert).toHaveBeenCalledOnce()
  })
})
