import { Injectable } from '@nestjs/common'
import {
  CalculationInput,
  CalculationResult,
  ICalculationStrategy,
  R2CategoryAverage,
} from './calculation-strategy.interface'
import { mean, roundHalfEven } from '../helpers/numeric'
import { trimmedMean } from '../helpers/trimmed-mean'

@Injectable()
export class R2Strategy implements ICalculationStrategy {
  calculate(input: CalculationInput): CalculationResult {
    const categoryAverages: R2CategoryAverage[] = []
    const warnings: Array<{ code: string; message: string }> = []

    // Agrupar scores por categoria
    const scoresByCategory = new Map<string, typeof input.scores>()
    for (const score of input.scores) {
      if (!scoresByCategory.has(score.categoryId)) {
        scoresByCategory.set(score.categoryId, [])
      }
      scoresByCategory.get(score.categoryId)!.push(score)
    }

    for (const category of input.categories) {
      const categoryScores = scoresByCategory.get(category.id) || []
      
      if (categoryScores.length === 0) {
        warnings.push({
          code: 'CATEGORY_NO_SCORES',
          message: `Categoria ${category.name} ignorada no cálculo pois não tem notas.`,
        })
        continue
      }

      let average = 0
      let ruleApplied: 'R2' | 'R1_FALLBACK' = 'R2'
      const values = categoryScores.map((s) => s.value)

      // Definir quais scores foram descartados (para o breakdown)
      // Array final de scoresUsed com flag descartado.
      const scoresUsed = categoryScores.map((score) => {
        const judge = input.judgesActiveInEvent.find((j) => j.id === score.judgeId)
        return {
          judgeId: score.judgeId,
          judgeName: judge ? judge.name : 'Desconhecido',
          value: score.value,
          discarded: false,
        }
      })

      if (categoryScores.length >= 3) {
        ruleApplied = 'R2'
        average = trimmedMean(values, 1)

        // Precisamos marcar um mínimo e um máximo como discarded
        const sortedValues = [...values].sort((a, b) => a - b)
        const minVal = sortedValues[0]
        const maxVal = sortedValues[sortedValues.length - 1]

        let minDiscarded = false
        let maxDiscarded = false

        for (const item of scoresUsed) {
          if (!minDiscarded && item.value === minVal) {
            item.discarded = true
            minDiscarded = true
          } else if (!maxDiscarded && item.value === maxVal) {
            item.discarded = true
            maxDiscarded = true
          }
        }
      } else {
        ruleApplied = 'R1_FALLBACK'
        average = mean(values)
        warnings.push({
          code: 'R1_FALLBACK_APPLIED',
          message: `Regra R1 (média simples) aplicada para a categoria ${category.name} por ter menos de 3 notas.`,
        })
      }

      categoryAverages.push({
        categoryId: category.id,
        categoryName: category.name,
        average,
        ruleApplied,
        scoresUsed,
      })
    }

    if (categoryAverages.length === 0) {
      warnings.push({ code: 'NO_SCORES_AVAILABLE', message: 'Nenhum score disponível para cálculo.' })
      return {
        finalScore: 0,
        finalScoreRaw: 0,
        breakdown: { categoryAverages: [] },
        warnings,
      }
    }

    const finalScoreRaw = mean(categoryAverages.map((ca) => ca.average))

    return {
      finalScoreRaw: roundHalfEven(finalScoreRaw, 4),
      finalScore: roundHalfEven(finalScoreRaw, 2),
      breakdown: { categoryAverages },
      warnings,
    }
  }
}
