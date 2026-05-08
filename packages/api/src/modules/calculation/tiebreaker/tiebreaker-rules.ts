import { R1Breakdown, R2Breakdown } from '../strategies/calculation-strategy.interface'

export interface ParticipantWithRawScore {
  participantId: string
  name: string
  presentationOrder: number
  finalScoreRaw: number
  finalScore: number
  categoryAggregates: Map<string, number>
  breakdown: R1Breakdown | R2Breakdown
}

export interface TiebreakerConfig {
  firstCategoryId: string | null
  secondCategoryId: string | null
}

export interface TiebreakerInfo {
  resolvedBy: 'NONE' | 'FIRST_CATEGORY' | 'SECOND_CATEGORY' | 'UNRESOLVED'
  details: Array<{
    rule: 'FIRST_CATEGORY' | 'SECOND_CATEGORY'
    categoryId: string
    categoryName: string
    myValue: number
    competitors: Array<{ participantId: string; value: number }>
  }>
}

export interface RankedParticipant extends ParticipantWithRawScore {
  position: number
  tiebreaker: TiebreakerInfo | null
}

export function applyTiebreaker(
  participants: ParticipantWithRawScore[],
  config: TiebreakerConfig,
  categoryNames: Map<string, string>,
): RankedParticipant[] {
  if (participants.length === 0) return []

  // 1. Sort by finalScoreRaw desc
  const sorted = [...participants].sort((a, b) => b.finalScoreRaw - a.finalScoreRaw)

  // 2. Group ties by finalScoreRaw
  const groups: ParticipantWithRawScore[][] = []
  let currentGroup: ParticipantWithRawScore[] = []

  for (const p of sorted) {
    if (currentGroup.length === 0) {
      currentGroup.push(p)
    } else {
      const firstInGroup = currentGroup[0]!
      // Use small epsilon for float comparison just in case, though raw scores should be exact enough
      if (Math.abs(p.finalScoreRaw - firstInGroup.finalScoreRaw) < 0.00001) {
        currentGroup.push(p)
      } else {
        groups.push(currentGroup)
        currentGroup = [p]
      }
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup)

  const rankedParticipants: RankedParticipant[] = []
  let currentPosition = 1

  for (const group of groups) {
    if (group.length === 1) {
      const p = group[0]!
      rankedParticipants.push({
        ...p,
        position: currentPosition,
        tiebreaker: null,
      })
      currentPosition++
      continue
    }

    // Tie detected! Apply cascade
    const resolvedGroup = resolveTies(group, config, categoryNames)

    // Assign positions within the resolved group
    let groupPositionOffset = 0
    let lastSubScore: string | null = null
    let itemsSinceLastDifferentSubScore = 0

    for (const p of resolvedGroup) {
      // Sub-positioning based on tiebreaker result
      // If still tied, they share position
      const currentSubScore = getSubScoreKey(p)

      if (lastSubScore !== null && currentSubScore !== lastSubScore) {
        groupPositionOffset += itemsSinceLastDifferentSubScore
        itemsSinceLastDifferentSubScore = 1
      } else {
        itemsSinceLastDifferentSubScore++
      }

      lastSubScore = currentSubScore

      rankedParticipants.push({
        ...p,
        position: currentPosition + groupPositionOffset,
      })
    }

    currentPosition += group.length
  }

  return rankedParticipants
}

function getSubScoreKey(p: RankedParticipant): string {
  // A key to identify if they are still tied after tiebreakers
  // We use the resolvedBy and the values of the categories used
  const tb = p.tiebreaker
  if (!tb || tb.resolvedBy === 'UNRESOLVED' || tb.resolvedBy === 'NONE') {
    return 'unresolved'
  }

  return tb.details.map(d => `${d.rule}:${d.myValue}`).join('|')
}

function resolveTies(
  group: ParticipantWithRawScore[],
  config: TiebreakerConfig,
  categoryNames: Map<string, string>,
): RankedParticipant[] {
  if (!config.firstCategoryId && !config.secondCategoryId) {
    return group.map(p => ({
      ...p,
      position: 0,
      tiebreaker: null,
    }))
  }

  let currentRanked: RankedParticipant[] = group.map(p => ({
    ...p,
    position: 0, // temporary
    tiebreaker: {
      resolvedBy: 'NONE',
      details: [],
    },
  }))

  // Step 1: First Category
  if (config.firstCategoryId) {
    currentRanked = applyCategoryTiebreaker(
      currentRanked,
      config.firstCategoryId,
      'FIRST_CATEGORY',
      categoryNames,
    )
  }

  // Step 2: Second Category (only for those still tied after first step)
  if (config.secondCategoryId) {
    // Re-group by the value of the first category to find sub-groups still tied
    const subGroups = groupByFirstTiebreakerValue(currentRanked, config.firstCategoryId)

    currentRanked = []
    for (const subGroup of subGroups) {
      if (subGroup.length === 1) {
        // Already resolved by first category — keep as is
        currentRanked.push(subGroup[0]!)
      } else {
        // Still tied — apply second category tiebreaker
        const resolved = applyCategoryTiebreaker(
          subGroup,
          config.secondCategoryId,
          'SECOND_CATEGORY',
          categoryNames,
        )
        currentRanked.push(...resolved)
      }
    }
  }

  return currentRanked
}

/**
 * Groups participants by their value in the first tiebreaker category.
 * This identifies sub-groups that are still tied after the first criterion.
 */
function groupByFirstTiebreakerValue(
  participants: RankedParticipant[],
  firstCategoryId: string | null,
): RankedParticipant[][] {
  if (!firstCategoryId) {
    return [participants]
  }

  const groups = new Map<number, RankedParticipant[]>()
  for (const p of participants) {
    const value = p.categoryAggregates.get(firstCategoryId) ?? -1
    if (!groups.has(value)) {
      groups.set(value, [])
    }
    groups.get(value)!.push(p)
  }

  // Return groups in the order they first appear in the input
  const seen = new Set<number>()
  const result: RankedParticipant[][] = []
  for (const p of participants) {
    const value = p.categoryAggregates.get(firstCategoryId) ?? -1
    if (!seen.has(value)) {
      seen.add(value)
      result.push(groups.get(value)!)
    }
  }
  return result
}

function applyCategoryTiebreaker(
  participants: RankedParticipant[],
  categoryId: string,
  rule: 'FIRST_CATEGORY' | 'SECOND_CATEGORY',
  categoryNames: Map<string, string>,
): RankedParticipant[] {
  const categoryName = categoryNames.get(categoryId) || 'Categoria desconhecida'

  // Sort participants by the category value descending
  const result = [...participants].sort((a, b) => {
    const valA = a.categoryAggregates.get(categoryId) ?? -1
    const valB = b.categoryAggregates.get(categoryId) ?? -1

    if (valB !== valA) {
      return valB - valA
    }

    return 0
  })

  // Update TiebreakerInfo
  return result.map(p => {
    const myValue = p.categoryAggregates.get(categoryId) ?? -1
    const competitors = result
      .filter(other => other.participantId !== p.participantId)
      .map(other => ({
        participantId: other.participantId,
        value: other.categoryAggregates.get(categoryId) ?? -1,
      }))

    const newDetails = [...(p.tiebreaker?.details || []), {
      rule,
      categoryId,
      categoryName,
      myValue,
      competitors,
    }]

    let resolvedBy = p.tiebreaker?.resolvedBy || 'NONE'

    if (resolvedBy === 'NONE' || resolvedBy === 'UNRESOLVED') {
      const isBetterThanSome = competitors.some(c => myValue > c.value)
      const isWorseThanSome = competitors.some(c => myValue < c.value)

      if (isBetterThanSome || isWorseThanSome) {
        resolvedBy = rule
      } else {
        resolvedBy = 'UNRESOLVED'
      }
    }

    return {
      ...p,
      tiebreaker: {
        resolvedBy,
        details: newDetails,
      },
    }
  })
}

export function selectTopN(ranked: RankedParticipant[], topN: number): RankedParticipant[] {
  if (ranked.length === 0 || topN <= 0) return []

  // Cutoff is the position of the N-th participant
  const actualTopN = Math.min(topN, ranked.length)
  const cutoffItem = ranked[actualTopN - 1]
  if (!cutoffItem) return []

  const cutoffPosition = cutoffItem.position

  return ranked.filter(p => p.position <= cutoffPosition)
}
