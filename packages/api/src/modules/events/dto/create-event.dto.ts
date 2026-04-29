import {
  IsString,
  MinLength,
  MaxLength,
  IsDate,
  IsEnum,
  IsNumber,
  IsInt,
  Min,
  Max,
} from 'class-validator'
import { Type } from 'class-transformer'
import { CalculationRule } from '@prisma/client'

export class CreateEventDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string

  @Type(() => Date)
  @IsDate()
  eventDate!: Date

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  location!: string

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  organizer!: string

  @IsEnum(CalculationRule)
  calculationRule!: CalculationRule

  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(99.9)
  scoreMin!: number

  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(99.9)
  scoreMax!: number

  @IsInt()
  @Min(1)
  @Max(1000)
  topN!: number
}
