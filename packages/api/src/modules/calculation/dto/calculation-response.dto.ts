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
    }>
    excluded: Array<{
      participant: {
        id: string
        name: string
      }
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
