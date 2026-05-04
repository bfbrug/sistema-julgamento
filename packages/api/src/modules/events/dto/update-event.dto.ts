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
  IsOptional,
} from 'class-validator'
import { Type } from 'class-transformer'
import { CalculationRule, EventStatus } from '@prisma/client'

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  eventDate?: Date

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  location?: string

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  organizer?: string

  @IsOptional()
  @IsEnum(CalculationRule)
  calculationRule?: CalculationRule

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(99.9)
  scoreMin?: number

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(99.9)
  scoreMax?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  topN?: number

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus
}
