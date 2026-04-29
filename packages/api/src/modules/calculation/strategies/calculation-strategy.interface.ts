export interface CalculationInput {
  participantId: string
  scores: Array<{
    judgeId: string
    categoryId: string
    value: number
  }>
  judgesActiveInEvent: Array<{ id: string; name: string; categoriesIds: string[] }>
  categories: Array<{ id: string; name: string }>
}

export interface R1JudgeAverage {
  judgeId: string
  judgeName: string
  average: number
  categoryScores: Array<{ categoryId: string; categoryName: string; value: number }>
}

export interface R1Breakdown {
  judgeAverages: R1JudgeAverage[]
}

export interface R2CategoryAverage {
  categoryId: string
  categoryName: string
  average: number
  ruleApplied: 'R2' | 'R1_FALLBACK'
  scoresUsed: Array<{ judgeId: string; judgeName: string; value: number; discarded: boolean }>
}

export interface R2Breakdown {
  categoryAverages: R2CategoryAverage[]
}

export interface CalculationResult {
  finalScore: number
  finalScoreRaw: number
  breakdown: R1Breakdown | R2Breakdown
  warnings: Array<{ code: string; message: string }>
}

export interface ICalculationStrategy {
  calculate(input: CalculationInput): CalculationResult
}
