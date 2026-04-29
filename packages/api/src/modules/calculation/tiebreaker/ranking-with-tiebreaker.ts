import { R1Breakdown, R2Breakdown } from '../strategies/calculation-strategy.interface'
import { ParticipantWithRawScore, applyTiebreaker, TiebreakerConfig, RankedParticipant } from './tiebreaker-rules'

export function calculateRankingsWithTiebreaker(
  results: any[],
  config: TiebreakerConfig,
  categoryNames: Map<string, string>,
): RankedParticipant[] {
  const participantsWithAggregates = results.map((r) => ({
    participantId: r.participant.id,
    name: r.participant.name,
    presentationOrder: r.participant.presentationOrder,
    finalScoreRaw: r.finalScoreRaw,
    finalScore: r.finalScore,
    breakdown: r.breakdown,
    categoryAggregates: calculateCategoryAggregates(r.breakdown),
  }))

  return applyTiebreaker(participantsWithAggregates, config, categoryNames)
}

function calculateCategoryAggregates(breakdown: R1Breakdown | R2Breakdown): Map<string, number> {
  const aggregates = new Map<string, number>()

  if ('judgeAverages' in (breakdown as R1Breakdown)) {
    const r1 = breakdown as R1Breakdown
    // R1: Average of category scores across all judges who scored this category for this participant
    const catSums = new Map<string, number>()
    const catCounts = new Map<string, number>()

    for (const ja of r1.judgeAverages) {
      for (const cs of ja.categoryScores) {
        catSums.set(cs.categoryId, (catSums.get(cs.categoryId) || 0) + cs.value)
        catCounts.set(cs.categoryId, (catCounts.get(cs.categoryId) || 0) + 1)
      }
    }

    for (const [catId, sum] of catSums.entries()) {
      const count = catCounts.get(catId) || 1
      aggregates.set(catId, sum / count)
    }
  } else if ('categoryAverages' in (breakdown as R2Breakdown)) {
    const r2 = breakdown as R2Breakdown
    // R2: Already has averages per category calculated by strategy
    for (const ca of r2.categoryAverages) {
      aggregates.set(ca.categoryId, ca.average)
    }
  }

  return aggregates
}
