import { Expose, Type } from 'class-transformer'

class CategoryCountsDto {
  @Expose() judgesAssigned!: number
  @Expose() scoresRecorded!: number
}

export class CategoryResponseDto {
  @Expose() id!: string
  @Expose() eventId!: string
  @Expose() name!: string
  @Expose() displayOrder!: number

  @Expose()
  @Type(() => CategoryCountsDto)
  counts!: CategoryCountsDto
}
