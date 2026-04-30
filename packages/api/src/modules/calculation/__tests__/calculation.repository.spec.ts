import { Test, TestingModule } from '@nestjs/testing'
import { CalculationRepository } from '../calculation.repository'
import { PrismaService } from '../../../config/prisma.service'
import { NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'

describe('CalculationRepository', () => {
  let repository: CalculationRepository

  const mockPrisma = {
    judgingEvent: {
      findFirst: vi.fn(),
    },
    participant: {
      findMany: vi.fn(),
    },
    judge: {
      findMany: vi.fn(),
    },
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalculationRepository,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile()

    repository = module.get<CalculationRepository>(CalculationRepository)
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(repository).toBeDefined()
  })

  describe('getEventForCalculation', () => {
    it('should return event data when found', async () => {
      mockPrisma.judgingEvent.findFirst.mockResolvedValueOnce({
        id: 'event-1',
        name: 'Event 1',
        calculationRule: 'R1',
        scoreMin: new Prisma.Decimal('0.0'),
        scoreMax: new Prisma.Decimal('10.0'),
        status: 'IN_PROGRESS',
        categories: [{ id: 'c1', name: 'Cat 1' }],
      })

      const result = await repository.getEventForCalculation('event-1', 'manager-1')

      expect(result).toEqual({
        id: 'event-1',
        name: 'Event 1',
        calculationRule: 'R1',
        scoreMin: 0,
        scoreMax: 10,
        status: 'IN_PROGRESS',
        categories: [{ id: 'c1', name: 'Cat 1' }],
      })
    })

    it('should throw NotFoundException when event not found', async () => {
      mockPrisma.judgingEvent.findFirst.mockResolvedValueOnce(null)

      await expect(repository.getEventForCalculation('event-1', 'manager-1')).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('getEligibleParticipants', () => {
    it('should return eligible participants with scores', async () => {
      mockPrisma.participant.findMany.mockResolvedValueOnce([
        {
          id: 'p1',
          name: 'P1',
          presentationOrder: 1,
          scores: [{ judgeId: 'j1', categoryId: 'c1', value: new Prisma.Decimal('10') }],
        },
      ])

      const result = await repository.getEligibleParticipants('event-1')

      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('p1')
    })
  })

  describe('getExcludedParticipants', () => {
    it('should return absent participants', async () => {
      mockPrisma.participant.findMany.mockResolvedValueOnce([
        { id: 'p2', name: 'P2' },
      ])

      const result = await repository.getExcludedParticipants('event-1')

      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('p2')
    })
  })

  describe('getJudgesActiveInEvent', () => {
    it('should return active judges mapped correctly', async () => {
      mockPrisma.judge.findMany.mockResolvedValueOnce([
        {
          id: 'j1',
          displayName: 'Judge 1',
          judgeCategories: [{ categoryId: 'c1' }, { categoryId: 'c2' }],
        },
      ])

      const result = await repository.getJudgesActiveInEvent('event-1')

      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('j1')
      expect(result[0]?.name).toBe('Judge 1')
      expect(result[0]?.categoriesIds).toEqual(['c1', 'c2'])
    })
  })
})
