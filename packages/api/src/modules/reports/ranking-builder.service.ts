import { Injectable, Inject } from '@nestjs/common'
import { PrismaService } from '../../config/prisma.service'
import { CalculationService } from '../calculation/calculation.service'
import { decimalToNumber } from '../calculation/helpers/numeric'

export interface ClassificationEntry {
  position: number
  participantId: string
  participantName: string
  finalScore: number
  scoresByCategory: Record<string, number>
  isAbsent: boolean
}

export interface DetailedJudgeEntry {
  judgeAlias: string
  scores: Array<{ participantName: string; categoryName: string; value: number }>
}

@Injectable()
export class RankingBuilderService {
  constructor(
    @Inject(CalculationService) private readonly calculationService: CalculationService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async buildClassification(eventId: string, managerId: string): Promise<ClassificationEntry[]> {
    const result = await this.calculationService.calculate(eventId, managerId)
    return result.data.rankings.map((r) => ({
      position: r.position,
      participantId: r.participant.id,
      participantName: r.participant.name,
      finalScore: Number(r.finalScore.toFixed(2)),
      scoresByCategory: this.extractCategoryScores(r.breakdown),
      isAbsent: false,
    }))
  }

  async buildTopN(eventId: string, managerId: string): Promise<ClassificationEntry[]> {
    const event = await this.prisma.judgingEvent.findFirst({
      where: { id: eventId },
      select: { topN: true },
    })
    const n = event?.topN ?? 10
    const result = await this.calculationService.getTopN(eventId, managerId, n)
    return result.data.rankings.map((r) => ({
      position: r.position,
      participantId: r.participant.id,
      participantName: r.participant.name,
      finalScore: Number(r.finalScore.toFixed(2)),
      scoresByCategory: this.extractCategoryScores(r.breakdown),
      isAbsent: false,
    }))
  }

  async buildAbsents(
    eventId: string,
    managerId: string,
  ): Promise<Pick<ClassificationEntry, 'participantId' | 'participantName'>[]> {
    const result = await this.calculationService.calculate(eventId, managerId)
    return result.data.excluded
      .filter((e) => e.reason === 'ABSENT')
      .map((e) => ({ participantId: e.participant.id, participantName: e.participant.name }))
  }

  async buildDetailedByJudge(eventId: string, managerId: string): Promise<DetailedJudgeEntry[]> {
    // Verify manager access
    await this.calculationService.calculate(eventId, managerId)

    const judges = await this.prisma.judge.findMany({
      where: { eventId },
      select: { id: true, displayName: true },
      orderBy: { id: 'asc' },
    })

    const scores = await this.prisma.score.findMany({
      where: { participant: { eventId }, isFinalized: true },
      select: {
        judgeId: true,
        value: true,
        participant: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: [{ judgeId: 'asc' }, { participant: { presentationOrder: 'asc' } }],
    })

    return judges.map((judge, idx) => {
      const alias = `Jurado ${idx + 1}`
      const judgeScores = scores
        .filter((s) => s.judgeId === judge.id)
        .map((s) => ({
          participantName: s.participant.name,
          categoryName: s.category.name,
          value: decimalToNumber(s.value),
        }))
      return { judgeAlias: alias, scores: judgeScores }
    })
  }

  private extractCategoryScores(breakdown: Record<string, unknown> | unknown): Record<string, number> {
    if (!breakdown || typeof breakdown !== 'object') return {}
    const b = breakdown as Record<string, unknown>

    // R1 breakdown: { categoryAverages: [{ categoryId, categoryName, average }] }
    // R2 breakdown: { categoryAverages: [{ categoryId, categoryName, average }] }
    const categoryAverages = b['categoryAverages']
    if (!Array.isArray(categoryAverages)) return {}

    const result: Record<string, number> = {}
    for (const cat of categoryAverages) {
      if (cat && typeof cat === 'object') {
        const c = cat as Record<string, unknown>
        if (typeof c['categoryName'] === 'string' && typeof c['average'] === 'number') {
          result[c['categoryName']] = Number(c['average'].toFixed(2))
        }
      }
    }
    return result
  }
}
