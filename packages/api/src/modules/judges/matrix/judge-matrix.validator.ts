import { CalculationRule, EventStatus } from '@prisma/client'
import { MatrixValidationReport } from '../dto/matrix-response.dto'

export interface ValidatorEvent {
  calculationRule: CalculationRule
  status: EventStatus
}

export interface ValidatorJudge {
  id: string
  displayName: string
}

export interface ValidatorCategory {
  id: string
  name: string
}

export interface ValidatorCell {
  judgeId: string
  categoryId: string
}

const R2_MIN_JUDGES = 3

/**
 * JudgeMatrixValidator — função pura (sem Prisma, sem I/O).
 * Recebe snapshots dos dados e retorna um MatrixValidationReport.
 */
export function validateMatrix(
  event: ValidatorEvent,
  judges: ValidatorJudge[],
  categories: ValidatorCategory[],
  cells: ValidatorCell[],
): MatrixValidationReport {
  const errors: MatrixValidationReport['errors'] = []
  const warnings: MatrixValidationReport['warnings'] = []

  // RN-09.5 — Sem categorias no evento
  if (categories.length === 0) {
    errors.push({
      code: 'NO_CATEGORIES_IN_EVENT',
      message: 'O evento não possui categorias cadastradas.',
    })
  }

  // RN-09.4 — Sem jurados no evento
  if (judges.length === 0) {
    errors.push({
      code: 'NO_JUDGES_IN_EVENT',
      message: 'O evento não possui jurados cadastrados.',
    })
  }

  // Não há mais o que validar se não existem ambos
  if (judges.length === 0 || categories.length === 0) {
    return { isValid: errors.length === 0, errors, warnings }
  }

  const judgeIds = new Set(judges.map((j) => j.id))
  const categoryIds = new Set(categories.map((c) => c.id))

  // Calcular jurados por categoria e categorias por jurado
  const judgesByCategoryId = new Map<string, string[]>()
  const categoriesByJudgeId = new Map<string, string[]>()

  for (const cat of categories) {
    judgesByCategoryId.set(cat.id, [])
  }
  for (const judge of judges) {
    categoriesByJudgeId.set(judge.id, [])
  }

  for (const cell of cells) {
    if (judgeIds.has(cell.judgeId) && categoryIds.has(cell.categoryId)) {
      judgesByCategoryId.get(cell.categoryId)?.push(cell.judgeId)
      categoriesByJudgeId.get(cell.judgeId)?.push(cell.categoryId)
    }
  }

  // RN-09.1 — Categoria sem jurado
  const categoriesWithoutJudge = categories.filter(
    (c) => (judgesByCategoryId.get(c.id) ?? []).length === 0,
  )
  if (categoriesWithoutJudge.length > 0) {
    errors.push({
      code: 'CATEGORY_WITHOUT_JUDGE',
      message: `${categoriesWithoutJudge.length} categoria(s) não possui(em) jurado(s) atribuído(s).`,
      details: { categories: categoriesWithoutJudge.map((c) => ({ id: c.id, name: c.name })) },
    })
  }

  // RN-09.2 — Jurado sem categoria
  const judgesWithoutCategory = judges.filter(
    (j) => (categoriesByJudgeId.get(j.id) ?? []).length === 0,
  )
  if (judgesWithoutCategory.length > 0) {
    errors.push({
      code: 'JUDGE_WITHOUT_CATEGORY',
      message: `${judgesWithoutCategory.length} jurado(s) não está(ão) atribuído(s) a nenhuma categoria.`,
      details: {
        judges: judgesWithoutCategory.map((j) => ({ id: j.id, displayName: j.displayName })),
      },
    })
  }

  // RN-09.3 — Cobertura R2 insuficiente (warning, não erro)
  if (event.calculationRule === CalculationRule.R2) {
    const insufficientCategories = categories
      .map((c) => ({
        id: c.id,
        name: c.name,
        judgeCount: (judgesByCategoryId.get(c.id) ?? []).length,
      }))
      .filter((c) => c.judgeCount > 0 && c.judgeCount < R2_MIN_JUDGES)

    if (insufficientCategories.length > 0) {
      warnings.push({
        code: 'R2_INSUFFICIENT_COVERAGE',
        message: `${insufficientCategories.length} categoria(s) com menos de ${R2_MIN_JUDGES} jurados sob regra R2. Será aplicada R1 como fallback.`,
        details: {
          categories: insufficientCategories.map((c) => ({
            id: c.id,
            name: c.name,
            judgeCount: c.judgeCount,
          })),
        },
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}
