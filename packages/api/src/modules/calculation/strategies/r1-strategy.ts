import { Injectable } from '@nestjs/common'
import {
  CalculationInput,
  CalculationResult,
  ICalculationStrategy,
  R1JudgeAverage,
} from './calculation-strategy.interface'
import { mean, roundHalfEven } from '../helpers/numeric'

@Injectable()
export class R1Strategy implements ICalculationStrategy {
  calculate(input: CalculationInput): CalculationResult {
    const judgeAverages: R1JudgeAverage[] = []
    const warnings: Array<{ code: string; message: string }> = []

    // Agrupar scores por jurado
    const scoresByJudge = new Map<string, typeof input.scores>()
    for (const score of input.scores) {
      if (!scoresByJudge.has(score.judgeId)) {
        scoresByJudge.set(score.judgeId, [])
      }
      scoresByJudge.get(score.judgeId)!.push(score)
    }

    // Processar cada jurado que tem notas
    for (const judge of input.judgesActiveInEvent) {
      const judgeScores = scoresByJudge.get(judge.id) || []
      if (judgeScores.length === 0) continue

      const categoryScores = judgeScores.map((score) => {
        const cat = input.categories.find((c) => c.id === score.categoryId)
        return {
          categoryId: score.categoryId,
          categoryName: cat ? cat.name : 'Desconhecida',
          value: score.value,
        }
      })

      const values = categoryScores.map((c) => c.value)
      const judgeAverage = mean(values)

      judgeAverages.push({
        judgeId: judge.id,
        judgeName: judge.name,
        average: judgeAverage,
        categoryScores,
      })
    }

    if (judgeAverages.length === 0) {
      warnings.push({ code: 'NO_SCORES_AVAILABLE', message: 'Nenhum score disponível para cálculo.' })
      return {
        finalScore: 0,
        finalScoreRaw: 0,
        breakdown: { judgeAverages: [] },
        warnings,
      }
    }

    const finalScoreRaw = mean(judgeAverages.map((ja) => ja.average))

    return {
      finalScoreRaw: roundHalfEven(finalScoreRaw, 4),
      finalScore: roundHalfEven(finalScoreRaw, 2),
      breakdown: { judgeAverages },
      warnings,
    }
  }
}
