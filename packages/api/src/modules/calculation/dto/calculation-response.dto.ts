export interface TiebreakerDetail {
  rule: 'FIRST_CATEGORY' | 'SECOND_CATEGORY'
  categoryId: string
  categoryName: string
  myValue: number
  competitors: Array<{ participantId: string; value: number }>
}

export interface TiebreakerInfo {
  resolvedBy: 'NONE' | 'FIRST_CATEGORY' | 'SECOND_CATEGORY' | 'UNRESOLVED'
  details: TiebreakerDetail[]
}

export interface CalculationResponseDto {
  data: {
    event: {
      id: string
      name: string
      calculationRule: string
      scoreMin: number
      scoreMax: number
      status: string
    }
    calculatedAt: string
    tiebreakerConfig: {
      firstCategory: { id: string; name: string } | null
      secondCategory: { id: string; name: string } | null
    } | null
    rankings: Array<{
      position: number
      participant: {
        id: string
        name: string
        presentationOrder: number
      }
      finalScore: number
      finalScoreRaw: number
      breakdown: Record<string, unknown> | unknown
      tiebreaker: TiebreakerInfo | null
    }>
    excluded: Array<{
      participant: { id: string; name: string }
      reason: 'ABSENT' | 'NO_SCORES'
    }>
    diagnostics: {
      totalParticipants: number
      rankedParticipants: number
      excludedParticipants: number
      r2FallbackCategories?: Array<{ id: string; name: string; reason: string }>
    }
  }
}
