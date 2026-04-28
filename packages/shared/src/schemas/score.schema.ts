import { z } from 'zod'

export function createScoreSchema(scoreMin: number, scoreMax: number) {
  return z
    .number({ required_error: 'A nota é obrigatória', invalid_type_error: 'A nota deve ser um número' })
    .min(scoreMin, `A nota mínima é ${scoreMin.toFixed(1)}`)
    .max(scoreMax, `A nota máxima é ${scoreMax.toFixed(1)}`)
    .refine((value) => Math.round(value * 10) / 10 === value, {
      message: 'A nota deve ter no máximo 1 casa decimal',
    })
}
