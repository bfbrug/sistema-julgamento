import { Expose, Type } from 'class-transformer'
import { CalculationRule } from '@prisma/client'

export class MatrixValidationIssue {
  @Expose()
  code!: string

  @Expose()
  message!: string

  @Expose()
  details?: unknown
}

export class MatrixValidationReport {
  @Expose()
  isValid!: boolean

  @Expose()
  @Type(() => MatrixValidationIssue)
  errors!: MatrixValidationIssue[]

  @Expose()
  @Type(() => MatrixValidationIssue)
  warnings!: MatrixValidationIssue[]
}

class EventSummaryDto {
  @Expose()
  id!: string

  @Expose()
  name!: string

  @Expose()
  calculationRule!: CalculationRule
}

class JudgeSummaryDto {
  @Expose()
  id!: string

  @Expose()
  displayName!: string

  @Expose()
  user!: { id: string; email: string; name: string }
}

class CategorySummaryDto {
  @Expose()
  id!: string

  @Expose()
  name!: string

  @Expose()
  displayOrder!: number
}

class CellDto {
  @Expose()
  judgeId!: string

  @Expose()
  categoryId!: string
}

class TotalsDto {
  @Expose()
  byCategoryId!: Record<string, number>

  @Expose()
  byJudgeId!: Record<string, number>
}

export class MatrixResponseDto {
  @Expose()
  @Type(() => EventSummaryDto)
  event!: EventSummaryDto

  @Expose()
  @Type(() => JudgeSummaryDto)
  judges!: JudgeSummaryDto[]

  @Expose()
  @Type(() => CategorySummaryDto)
  categories!: CategorySummaryDto[]

  @Expose()
  @Type(() => CellDto)
  cells!: CellDto[]

  @Expose()
  @Type(() => TotalsDto)
  totals!: TotalsDto

  @Expose()
  @Type(() => MatrixValidationReport)
  validation!: MatrixValidationReport
}
