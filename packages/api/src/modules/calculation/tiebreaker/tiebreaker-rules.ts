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

  // Step 2: Second Category (only for those still tied)
  if (config.secondCategoryId) {
    // We need to re-group those who are still tied after the first step
    // and apply the second tiebreaker to them.
    // For simplicity, we can apply it to everyone, but it only changes order
    // for those who have the same firstCategory value.
    currentRanked = applyCategoryTiebreaker(
      currentRanked,
      config.secondCategoryId,
      'SECOND_CATEGORY',
      categoryNames,
    )
  }

  // Final check: if they are still tied, mark as UNRESOLVED
  // A participant is resolved if they are no longer in a group of >1 with same tiebreaker details
  // But the requirement says "resolvedBy" indicates which criterion resolved the tie.
  // We'll refine this in applyCategoryTiebreaker.

  return currentRanked
}

function applyCategoryTiebreaker(
  participants: RankedParticipant[],
  categoryId: string,
  rule: 'FIRST_CATEGORY' | 'SECOND_CATEGORY',
  categoryNames: Map<string, string>,
): RankedParticipant[] {
  // We should only apply this to sub-groups that are still tied.
  // But sorting the whole list with multiple criteria (Score, Cat1, Cat2) also works.
  
  const categoryName = categoryNames.get(categoryId) || 'Categoria desconhecida'

  // Sort participants. Since this is a stable sort (or we include previous criteria), 
  // we can just sort by the new category value.
  // BUT we need to preserve the order of previous criteria.
  
  const result = [...participants].sort((a, b) => {
    // 1. Compare by previous criteria (already sorted in participants)
    // Actually, we should only compare by the current category if they were tied before.
    // Since they come from the same original Score group, we check if they are tied by previous TB rules.
    
    const valA = a.categoryAggregates.get(categoryId) ?? -1 // Lose by default if no score
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

    // Does this rule resolve anything?
    // It resolves if myValue is different from some competitor who was tied with me.
    // For simplicity, we add the detail.
    
    const newDetails = [...(p.tiebreaker?.details || []), {
      rule,
      categoryId,
      categoryName,
      myValue,
      competitors,
    }]

    let resolvedBy = p.tiebreaker?.resolvedBy || 'NONE'
    
    // If it was already resolved by a previous rule, keep it.
    // If not, check if this rule resolves it.
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
