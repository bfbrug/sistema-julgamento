import { Expose, Type } from 'class-transformer'
import { CalculationRule, EventStatus } from '@prisma/client'

export class TiebreakerConfigDto {
  @Expose() id!: string
  @Expose() eventId!: string
  @Expose() firstCategoryId!: string | null
  @Expose() secondCategoryId!: string | null
}

class CountsDto {
  @Expose() categories!: number
  @Expose() judges!: number
  @Expose() participants!: number
}

export class EventResponseDto {
  @Expose() id!: string
  @Expose() name!: string
  @Expose() eventDate!: string
  @Expose() location!: string
  @Expose() organizer!: string
  @Expose() calculationRule!: CalculationRule
  @Expose() scoreMin!: number
  @Expose() scoreMax!: number
  @Expose() topN!: number
  @Expose() status!: EventStatus
  @Expose() certificateText!: string | null
  @Expose() managerId!: string
  @Expose() createdAt!: string
  @Expose() updatedAt!: string
  @Expose() deletedAt!: string | null

  @Expose()
  @Type(() => TiebreakerConfigDto)
  tiebreaker!: TiebreakerConfigDto | null

  @Expose()
  @Type(() => CountsDto)
  counts!: CountsDto
}
