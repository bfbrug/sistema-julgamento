import { Injectable, Inject, BadRequestException } from '@nestjs/common'
import { CalculationRepository } from './calculation.repository'
import { CalculationResponseDto } from './dto/calculation-response.dto'
import { R1Strategy } from './strategies/r1-strategy'
import { R2Strategy } from './strategies/r2-strategy'
import { CalculationInput, R2Breakdown } from './strategies/calculation-strategy.interface'
import { decimalToNumber } from './helpers/numeric'
import { TiebreakerService } from './tiebreaker/tiebreaker.service'

@Injectable()
export class CalculationService {
  private cache = new Map<string, { timestamp: number; data: CalculationResponseDto }>()
  private readonly CACHE_TTL_MS = 30000 // 30 seconds

  constructor(
    @Inject(CalculationRepository) private readonly repository: CalculationRepository,
    @Inject(R1Strategy) private readonly r1Strategy: R1Strategy,
    @Inject(R2Strategy) private readonly r2Strategy: R2Strategy,
    @Inject(TiebreakerService) private readonly tiebreakerService: TiebreakerService,
  ) {}

  async calculate(eventId: string, managerId: string): Promise<CalculationResponseDto> {
    const cacheKey = `event:${eventId}:calculation`
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data
    }

    const event = await this.repository.getEventForCalculation(eventId, managerId)
    const judges = await this.repository.getJudgesActiveInEvent(eventId)
    const eligibleParticipants = await this.repository.getEligibleParticipants(eventId)
    const excludedParticipantsData = await this.repository.getExcludedParticipants(eventId)

    let strategy: R1Strategy | R2Strategy
    if (event.calculationRule === 'R1') {
      strategy = this.r1Strategy
    } else if (event.calculationRule === 'R2') {
      strategy = this.r2Strategy
    } else {
      throw new BadRequestException(`Regra de cálculo não suportada: ${event.calculationRule}`)
    }

    const excluded: Array<{
      participant: { id: string; name: string }
      reason: 'ABSENT' | 'NO_SCORES'
    }> = excludedParticipantsData.map((p) => ({
      participant: { id: p.id, name: p.name },
      reason: 'ABSENT',
    }))

    const results: unknown[] = []
    const r2FallbackCategories: Array<{ id: string; name: string; reason: string }> = []

    for (const participant of eligibleParticipants) {
      const input: CalculationInput = {
        participantId: participant.id,
        judgesActiveInEvent: judges,
        categories: event.categories,
        scores: participant.scores.map((s) => ({
          judgeId: s.judgeId,
          categoryId: s.categoryId,
          value: decimalToNumber(s.value),
        })),
      }

      const calculated = strategy.calculate(input)

      if (calculated.warnings.some((w) => w.code === 'NO_SCORES_AVAILABLE')) {
        excluded.push({
          participant: { id: participant.id, name: participant.name },
          reason: 'NO_SCORES',
        })
      } else {
        results.push({
          participant: {
            id: participant.id,
            name: participant.name,
            presentationOrder: participant.presentationOrder,
          },
          ...calculated,
        })

        // Collect fallback diagnostics
        if (event.calculationRule === 'R2') {
          const breakdown = calculated.breakdown as R2Breakdown
          for (const cat of breakdown.categoryAverages) {
            if (
              cat.ruleApplied === 'R1_FALLBACK' &&
              !r2FallbackCategories.some((c) => c.id === cat.categoryId)
            ) {
              r2FallbackCategories.push({
                id: cat.categoryId,
                name: cat.categoryName,
                reason: 'Menos de 3 notas disponíveis',
              })
            }
          }
        }
      }
    }

    // Apply Tiebreaker
    const [tiebreakerConfig, categoryNames] = await Promise.all([
      this.repository.getTiebreakerConfig(eventId),
      this.repository.getCategoryNamesMap(eventId),
    ])

    const ranked = this.tiebreakerService.apply(results, tiebreakerConfig, categoryNames)

    const response: CalculationResponseDto = {
      data: {
        event: {
          id: event.id,
          name: event.name,
          calculationRule: event.calculationRule,
          scoreMin: event.scoreMin,
          scoreMax: event.scoreMax,
          status: event.status,
        },
        calculatedAt: new Date().toISOString(),
        tiebreakerConfig: tiebreakerConfig
          ? {
              firstCategory: tiebreakerConfig.firstCategoryId
                ? {
                    id: tiebreakerConfig.firstCategoryId,
                    name: categoryNames.get(tiebreakerConfig.firstCategoryId) || '?',
                  }
                : null,
              secondCategory: tiebreakerConfig.secondCategoryId
                ? {
                    id: tiebreakerConfig.secondCategoryId,
                    name: categoryNames.get(tiebreakerConfig.secondCategoryId) || '?',
                  }
                : null,
            }
          : null,
        rankings: ranked.map((r) => ({
          position: r.position,
          participant: {
            id: r.participantId,
            name: r.name,
            presentationOrder: r.presentationOrder,
          },
          finalScore: r.finalScore,
          finalScoreRaw: r.finalScoreRaw,
          breakdown: r.breakdown,
          tiebreaker: r.tiebreaker,
        })),
        excluded,
        diagnostics: {
          totalParticipants: eligibleParticipants.length + excludedParticipantsData.length,
          rankedParticipants: ranked.length,
          excludedParticipants: excluded.length,
          r2FallbackCategories: r2FallbackCategories.length > 0 ? r2FallbackCategories : undefined,
        },
      },
    }

    this.cache.set(cacheKey, { timestamp: Date.now(), data: response })

    return response
  }

  async getTopN(eventId: string, managerId: string, n: number): Promise<CalculationResponseDto> {
    const fullCalculation = await this.calculate(eventId, managerId)
    
    // We need to use the actual position for boundary expansion
    // The tiebreaker service has the logic for this
    
    // Convert DTO back to a format suitable for TiebreakerService.selectTopN
    // Actually, we can just filter the rankings in the DTO
    
    if (fullCalculation.data.rankings.length === 0 || n <= 0) {
      return {
        ...fullCalculation,
        data: {
          ...fullCalculation.data,
          rankings: [],
        },
      }
    }

    const actualN = Math.min(n, fullCalculation.data.rankings.length)
    const cutoffPosition = fullCalculation.data.rankings[actualN - 1]?.position
    
    if (cutoffPosition === undefined) return fullCalculation

    const topRankings = fullCalculation.data.rankings.filter(r => r.position <= cutoffPosition)

    return {
      ...fullCalculation,
      data: {
        ...fullCalculation.data,
        rankings: topRankings,
      },
    }
  }

  invalidateCache(eventId: string) {
    this.cache.delete(`event:${eventId}:calculation`)
  }
}
