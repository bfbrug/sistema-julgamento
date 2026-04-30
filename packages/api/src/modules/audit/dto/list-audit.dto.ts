import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class ListAuditDto {
  @IsOptional()
  @IsString()
  cursor?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50

  @IsOptional()
  @IsString()
  action?: string

  @IsOptional()
  @IsString()
  actorId?: string

  @IsOptional()
  @IsString()
  entityType?: string

  @IsOptional()
  @IsString()
  entityId?: string

  @IsOptional()
  @IsString()
  startDate?: string

  @IsOptional()
  @IsString()
  endDate?: string
}
