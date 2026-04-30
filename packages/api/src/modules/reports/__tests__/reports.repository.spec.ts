import { Test, TestingModule } from '@nestjs/testing'
import { ReportsRepository } from '../reports.repository'
import { PrismaService } from '../../../config/prisma.service'
import { ReportJobStatus, ReportType } from '@prisma/client'

describe('ReportsRepository', () => {
  let repository: ReportsRepository

  const mockPrisma = {
    reportJob: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    score: {
      count: vi.fn(),
    },
    judge: {
      count: vi.fn(),
    },
    judgeParticipantSession: {
      groupBy: vi.fn(),
    },
    judgingEvent: {
      findFirst: vi.fn(),
    },
  }

  beforeEach(async () => {
    vi.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    repository = module.get<ReportsRepository>(ReportsRepository)
  })

  it('create() should call prisma.reportJob.create', async () => {
    mockPrisma.reportJob.create.mockResolvedValueOnce({ id: 'j1' })
    const result = await repository.create({ eventId: 'e1', type: ReportType.TOP_N, requestedBy: 'm1' })
    expect(result).toEqual({ id: 'j1' })
    expect(mockPrisma.reportJob.create).toHaveBeenCalledWith({
      data: { eventId: 'e1', type: ReportType.TOP_N, requestedBy: 'm1' },
    })
  })

  it('findById() should throw if not found', async () => {
    mockPrisma.reportJob.findUnique.mockResolvedValueOnce(null)
    await expect(repository.findById('j1')).rejects.toThrow('ReportJob j1 não encontrado')
  })

  it('findById() should return job if found', async () => {
    mockPrisma.reportJob.findUnique.mockResolvedValueOnce({ id: 'j1' })
    const result = await repository.findById('j1')
    expect(result).toEqual({ id: 'j1' })
  })

  it('update() should call prisma.reportJob.update', async () => {
    mockPrisma.reportJob.update.mockResolvedValueOnce({ id: 'j1', status: 'COMPLETED' })
    const result = await repository.update('j1', { status: ReportJobStatus.COMPLETED })
    expect(result).toEqual({ id: 'j1', status: 'COMPLETED' })
    expect(mockPrisma.reportJob.update).toHaveBeenCalledWith({
      where: { id: 'j1' },
      data: { status: 'COMPLETED' },
    })
  })

  it('findLastCompleted() should return the latest completed job', async () => {
    mockPrisma.reportJob.findFirst.mockResolvedValueOnce({ id: 'j1' })
    const result = await repository.findLastCompleted('e1', ReportType.TOP_N)
    expect(result).toEqual({ id: 'j1' })
    expect(mockPrisma.reportJob.findFirst).toHaveBeenCalledWith({
      where: { eventId: 'e1', type: ReportType.TOP_N, status: ReportJobStatus.COMPLETED },
      orderBy: { completedAt: 'desc' },
    })
  })

  it('countFinishedScores() should return count', async () => {
    mockPrisma.score.count.mockResolvedValueOnce(5)
    const result = await repository.countFinishedScores('e1')
    expect(result).toBe(5)
    expect(mockPrisma.score.count).toHaveBeenCalledWith({
      where: { participant: { eventId: 'e1' }, isFinalized: true },
    })
  })

  it('countPendingJudges() should return total - finished', async () => {
    mockPrisma.judge.count.mockResolvedValueOnce(3)
    mockPrisma.judgeParticipantSession.groupBy.mockResolvedValueOnce([{ judgeId: 'j1' }])
    const result = await repository.countPendingJudges('e1')
    expect(result).toBe(2) // 3 total - 1 finished
    expect(mockPrisma.judge.count).toHaveBeenCalledWith({ where: { eventId: 'e1' } })
    expect(mockPrisma.judgeParticipantSession.groupBy).toHaveBeenCalledWith({
      by: ['judgeId'],
      where: { judge: { eventId: 'e1' }, status: 'FINISHED' },
    })
  })

  it('getEventStatus() should return event data', async () => {
    mockPrisma.judgingEvent.findFirst.mockResolvedValueOnce({ status: 'IN_PROGRESS' })
    const result = await repository.getEventStatus('e1', 'm1')
    expect(result).toEqual({ status: 'IN_PROGRESS' })
    expect(mockPrisma.judgingEvent.findFirst).toHaveBeenCalledWith({
      where: { id: 'e1', managerId: 'm1' },
      select: { status: true, topN: true, name: true, eventDate: true, location: true, organizer: true },
    })
  })
})
