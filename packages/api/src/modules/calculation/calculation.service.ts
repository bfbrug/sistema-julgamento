import { Injectable, Inject, BadRequestException } from '@nestjs/common'
import { CalculationRepository } from './calculation.repository'
import { CalculationResponseDto } from './dto/calculation-response.dto'
import { R1Strategy } from './strategies/r1-strategy'
import { R2Strategy } from './strategies/r2-strategy'
import { CalculationInput, R2Breakdown } from './strategies/calculation-strategy.interface'
import { decimalToNumber } from './helpers/numeric'

@Injectable()
export class CalculationService {
  private cache = new Map<string, { timestamp: number; data: CalculationResponseDto }>()
  private readonly CACHE_TTL_MS = 30000 // 30 seconds

  constructor(
    @Inject(CalculationRepository) private readonly repository: CalculationRepository,
    @Inject(R1Strategy) private readonly r1Strategy: R1Strategy,
    @Inject(R2Strategy) private readonly r2Strategy: R2Strategy,
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

    const excluded: Array<{ participant: { id: string; name: string }; reason: 'ABSENT' | 'NO_SCORES' }> = excludedParticipantsData.map((p: any) => ({
      participant: { id: p.id, name: p.name },
      reason: 'ABSENT',
    }))

    const results: any[] = []
    const r2FallbackCategories: Array<{ id: string; name: string; reason: string }> = []

    for (const participant of eligibleParticipants) {
      const input: CalculationInput = {
        participantId: participant.id,
        judgesActiveInEvent: judges,
        categories: event.categories,
        scores: participant.scores.map((s: any) => ({
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

    // Sort by finalScoreRaw desc
    results.sort((a, b) => b.finalScoreRaw - a.finalScoreRaw)

    // Assign positions (ties get same position)
    let currentPosition = 1
    let previousScoreRaw: number | null = null
    let itemsSinceLastDifferentScore = 0

    const rankings = results.map((result) => {
      if (previousScoreRaw !== null && result.finalScoreRaw < previousScoreRaw) {
        currentPosition += itemsSinceLastDifferentScore
        itemsSinceLastDifferentScore = 1
      } else {
        itemsSinceLastDifferentScore++
      }

      previousScoreRaw = result.finalScoreRaw

      return {
        position: currentPosition,
        participant: result.participant,
        finalScore: result.finalScore,
        finalScoreRaw: result.finalScoreRaw,
        breakdown: result.breakdown,
      }
    })

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
        rankings,
        excluded,
        diagnostics: {
          totalParticipants: eligibleParticipants.length + excludedParticipantsData.length,
          rankedParticipants: rankings.length,
          excludedParticipants: excluded.length,
          r2FallbackCategories: r2FallbackCategories.length > 0 ? r2FallbackCategories : undefined,
        },
      },
    }

    this.cache.set(cacheKey, { timestamp: Date.now(), data: response })

    return response
  }

  invalidateCache(eventId: string) {
    this.cache.delete(`event:${eventId}:calculation`)
  }
}
