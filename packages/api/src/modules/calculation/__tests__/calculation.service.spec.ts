import { Test, TestingModule } from '@nestjs/testing'
import { CalculationService } from '../calculation.service'
import { CalculationRepository } from '../calculation.repository'
import { R1Strategy } from '../strategies/r1-strategy'
import { R2Strategy } from '../strategies/r2-strategy'
import { Prisma } from '@prisma/client'

describe('CalculationService', () => {
  let service: CalculationService
  let repository: CalculationRepository

  const mockRepository = {
    getEventForCalculation: vi.fn(),
    getJudgesActiveInEvent: vi.fn(),
    getEligibleParticipants: vi.fn(),
    getExcludedParticipants: vi.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalculationService,
        {
          provide: CalculationRepository,
          useValue: mockRepository,
        },
        R1Strategy,
        R2Strategy,
      ],
    }).compile()

    service = module.get<CalculationService>(CalculationService)
    repository = module.get<CalculationRepository>(CalculationRepository)

    vi.clearAllMocks()
    
    // Default mocks
    mockRepository.getEventForCalculation.mockResolvedValue({
      id: 'event-1',
      name: 'Event 1',
      calculationRule: 'R1',
      scoreMin: 0,
      scoreMax: 10,
      status: 'IN_PROGRESS',
      categories: [{ id: 'c1', name: 'Cat 1' }],
    })

    mockRepository.getJudgesActiveInEvent.mockResolvedValue([
      { id: 'j1', name: 'J1', categoriesIds: ['c1'] },
    ])

    mockRepository.getExcludedParticipants.mockResolvedValue([])
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should calculate rankings and handle ties sharing same position', async () => {
    mockRepository.getEligibleParticipants.mockResolvedValue([
      {
        id: 'p1',
        name: 'P1',
        presentationOrder: 1,
        scores: [{ judgeId: 'j1', categoryId: 'c1', value: new Prisma.Decimal(10) }],
      },
      {
        id: 'p2',
        name: 'P2',
        presentationOrder: 2,
        scores: [{ judgeId: 'j1', categoryId: 'c1', value: new Prisma.Decimal(8) }],
      },
      {
        id: 'p3',
        name: 'P3',
        presentationOrder: 3,
        scores: [{ judgeId: 'j1', categoryId: 'c1', value: new Prisma.Decimal(10) }],
      },
    ])

    const result = await service.calculate('event-1', 'manager-1')

    const rankings = result.data.rankings
    expect(rankings).toHaveLength(3)

    // p1 and p3 should tie for 1st place
    expect(rankings[0]!.finalScore).toBe(10)
    expect(rankings[0]!.position).toBe(1)
    expect(rankings[1]!.finalScore).toBe(10)
    expect(rankings[1]!.position).toBe(1)
    
    // p2 should be 3rd place
    expect(rankings[2]!.finalScore).toBe(8)
    expect(rankings[2]!.position).toBe(3)
  })

  it('should use cache for subsequent calls within TTL', async () => {
    mockRepository.getEligibleParticipants.mockResolvedValue([])

    await service.calculate('event-1', 'manager-1')
    await service.calculate('event-1', 'manager-1')

    expect(repository.getEventForCalculation).toHaveBeenCalledTimes(1)
  })

  it('should invalidate cache when requested', async () => {
    mockRepository.getEligibleParticipants.mockResolvedValue([])

    await service.calculate('event-1', 'manager-1')
    service.invalidateCache('event-1')
    await service.calculate('event-1', 'manager-1')

    expect(repository.getEventForCalculation).toHaveBeenCalledTimes(2)
  })

  it('should include absent participants in excluded list', async () => {
    mockRepository.getEligibleParticipants.mockResolvedValue([])
    mockRepository.getExcludedParticipants.mockResolvedValue([
      { id: 'p_absent', name: 'Absent Participant' },
    ])

    const result = await service.calculate('event-1', 'manager-1')

    expect(result.data.excluded).toHaveLength(1)
    expect(result.data.excluded[0]!.reason).toBe('ABSENT')
    expect(result.data.excluded[0]!.participant.id).toBe('p_absent')
  })

  it('should include participants without scores in excluded list', async () => {
    mockRepository.getEligibleParticipants.mockResolvedValue([
      {
        id: 'p_no_scores',
        name: 'No Scores Participant',
        presentationOrder: 1,
        scores: [],
      },
    ])
    mockRepository.getExcludedParticipants.mockResolvedValue([])

    const result = await service.calculate('event-1', 'manager-1')

    expect(result.data.rankings).toHaveLength(0)
    expect(result.data.excluded).toHaveLength(1)
    expect(result.data.excluded[0]!.reason).toBe('NO_SCORES')
  })

  it('should collect R2 fallback diagnostics when R2 rule is applied with less than 3 scores', async () => {
    mockRepository.getEventForCalculation.mockResolvedValue({
      id: 'event-1',
      name: 'Event 1',
      calculationRule: 'R2',
      scoreMin: 0,
      scoreMax: 10,
      status: 'IN_PROGRESS',
      categories: [{ id: 'c1', name: 'Cat 1' }],
    })

    mockRepository.getEligibleParticipants.mockResolvedValue([
      {
        id: 'p1',
        name: 'P1',
        presentationOrder: 1,
        scores: [
          { judgeId: 'j1', categoryId: 'c1', value: new Prisma.Decimal(10) },
          { judgeId: 'j2', categoryId: 'c1', value: new Prisma.Decimal(8) },
        ],
      },
    ])

    const result = await service.calculate('event-1', 'manager-1')

    expect(result.data.diagnostics.r2FallbackCategories).toBeDefined()
    expect(result.data.diagnostics.r2FallbackCategories).toHaveLength(1)
    expect(result.data.diagnostics.r2FallbackCategories![0]!.id).toBe('c1')
  })

  it('should throw BadRequestException if rule is unsupported', async () => {
    mockRepository.getEventForCalculation.mockResolvedValue({
      id: 'event-1',
      name: 'Event 1',
      calculationRule: 'R3',
      categories: [],
    })

    await expect(service.calculate('event-1', 'manager-1')).rejects.toThrow('Regra de cálculo não suportada: R3')
  })
})
