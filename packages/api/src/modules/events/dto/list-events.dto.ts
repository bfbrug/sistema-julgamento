import { IsOptional, IsString, IsEnum, IsInt, Min, Max, IsBoolean } from 'class-validator'
import { Type } from 'class-transformer'
import { EventStatus } from '@prisma/client'

export class ListEventsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeDeleted?: boolean = false
}
